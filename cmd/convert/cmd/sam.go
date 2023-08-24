package cmd

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func SAM(ctx context.Context) error {
	// uploader
	uploader, err := newS3Uploader(ctx)
	if err != nil {
		return err
	}

	l := &mSAMLoader{
		Ctx:      ctx,
		Uploader: uploader,
	}
	format, err := l.load()
	if err != nil {
		return err
	}

	// save
	formatJson, err := json.Marshal(format)
	if err != nil {
		return errors.WithStack(err)
	}
	if err := os.WriteFile(SaveOption.OutputPath, formatJson, 0644); err != nil {
		return errors.WithStack(err)
	}

	// done
	zap.L().Info("successfully converted an image segmentation dataset in SAM format", zap.String("output", SaveOption.OutputPath))

	return nil
}

type mSAMLoader struct {
	Ctx      context.Context
	Uploader *mS3Uploader
}

func (l *mSAMLoader) load() (*Format, error) {
	dir := SAMOption.Dir

	fs, err := os.ReadDir(dir)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	var annoFiles []string
	for _, f := range fs {
		if filepath.Ext(f.Name()) == ".json" {
			annoFiles = append(annoFiles, f.Name())
		}
	}
	zap.L().Info("loaded annotation JSON files", zap.Int("count", len(annoFiles)))

	var resAnnos []*ResourceAnnotation
	for _, annoFile := range annoFiles {
		annoPath := filepath.Join(dir, annoFile)
		sample, err := l.loadSample(annoPath)
		if err != nil {
			return nil, err
		}

		imPath := filepath.Join(dir, sample.Image.FileName)
		res, err := l.loadResource(imPath)
		if err != nil {
			return nil, err
		}
		masks, err := l.loadMasks(sample)
		if err != nil {
			return nil, err
		}

		var entities []*Entity
		for _, mask := range masks {
			entity := &Entity{
				SliceComponents: map[int]*ComponentList{
					0: {Masks: []*Mask{mask}},
				},
			}
			entities = append(entities, entity)
		}
		resAnnos = append(resAnnos, &ResourceAnnotation{
			Resource:   res,
			Annotation: &Annotation{Entities: entities},
		})
	}

	return &Format{
		ProjectSpec: &ProjectSpec{},
		Annotations: resAnnos,
	}, nil
}

func (l *mSAMLoader) loadMasks(s *mSAMSample) ([]*Mask, error) {
	var ms []*Mask
	for _, a := range s.Annotations {
		m := &Mask{
			Rle: &RunLengthEncoding{
				CocoCounts: a.Segmentation.Counts,
				Size:       []int{s.Image.Height, s.Image.Width},
			},
		}
		ms = append(ms, m)
	}
	return ms, nil
}

func (l *mSAMLoader) loadResource(imPath string) (*VideoResource, error) {
	imUrl, err := l.Uploader.Upload(l.Ctx, imPath, filepath.Base(imPath))
	if err != nil {
		return nil, err
	}
	return &VideoResource{
		Type:      "video",
		Name:      filepath.Base(imPath),
		FrameUrls: []string{imUrl},
	}, nil
}

func (l *mSAMLoader) loadSample(fpath string) (*mSAMSample, error) {
	var sample mSAMSample

	f, err := os.Open(fpath)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer f.Close()

	decoder := json.NewDecoder(f)
	if err := decoder.Decode(&sample); err != nil {
		return nil, errors.WithStack(err)
	}

	return &sample, nil
}

type mSAMSample struct {
	Image struct {
		FileName string `json:"file_name"`
		Width    int    `json:"width"`
		Height   int    `json:"height"`
	} `json:"image"`
	Annotations []struct {
		Segmentation struct {
			Counts string `json:"counts"`
		} `json:"segmentation"`
	} `json:"annotations"`
}
