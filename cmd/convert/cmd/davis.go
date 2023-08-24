package cmd

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func DAVIS(ctx context.Context) error {
	l := &mDAVISLoader{}

	format, err := l.load(ctx)
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
	zap.L().Info("successfully converted a video segmentation dataset in DAVIS format", zap.String("output", SaveOption.OutputPath))

	return nil
}

type mDAVISLoader struct {
}

func (l *mDAVISLoader) load(ctx context.Context) (*Format, error) {
	// load videos
	videos, err := l.loadDataset()
	if err != nil {
		return nil, err
	}

	// uploader
	uploader, err := newS3Uploader(ctx)
	if err != nil {
		return nil, err
	}

	// load annos
	var resAnnos []*ResourceAnnotation
	for _, v := range videos {
		resAnno, err := l.convertVideo(ctx, v, uploader)
		if err != nil {
			return nil, err
		}
		resAnnos = append(resAnnos, resAnno)
	}

	return &Format{
		ProjectSpec: &ProjectSpec{},
		Annotations: resAnnos,
	}, nil
}

func (l *mDAVISLoader) convertVideo(ctx context.Context, v *mDavisVideo, uploader *mS3Uploader) (*ResourceAnnotation, error) {
	// load entities
	entitySet := make(map[mEntityId]*Entity)
	for sliceIdx, f := range v.Frames {
		masks, err := loadPngMask(f.AnnoPath)
		if err != nil {
			return nil, err
		}
		for eid, components := range masks {
			if _, has := entitySet[eid]; !has {
				entitySet[eid] = &Entity{
					SliceComponents: make(map[int]*ComponentList),
				}
			}
			entitySet[eid].SliceComponents[sliceIdx] = &ComponentList{
				Masks: components,
			}
		}
	}
	var entities []*Entity
	for _, e := range entitySet {
		entities = append(entities, e)
	}

	// upload frames
	var frameUrls []string
	for _, f := range v.Frames {
		relPath, err := filepath.Rel(DAVISOption.VideoDir, f.ImagePath)
		if err != nil {
			return nil, err
		}

		frameUrl, err := uploader.Upload(ctx, f.ImagePath, relPath)
		if err != nil {
			return nil, err
		}
		frameUrls = append(frameUrls, frameUrl)
	}
	resource := &VideoResource{
		Type:      "video",
		Name:      v.Name,
		FrameUrls: frameUrls,
	}

	return &ResourceAnnotation{
		Resource: resource,
		Annotation: &Annotation{
			Entities: entities,
		},
	}, nil
}

type mDavisVideo struct {
	Name   string
	Frames []*mDavisFrame
}

type mDavisFrame struct {
	ImagePath string
	AnnoPath  string
}

func (l *mDAVISLoader) loadDataset() ([]*mDavisVideo, error) {
	videoDirs, err := os.ReadDir(DAVISOption.VideoDir)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	var videos []*mDavisVideo
	for _, d := range videoDirs {
		if !d.IsDir() {
			continue
		}

		videoName := d.Name()
		annoDir := filepath.Join(DAVISOption.AnnoDir, videoName)

		if _, err := os.Stat(annoDir); err != nil {
			if os.IsNotExist(err) {
				zap.L().Warn("missing annotation folder", zap.String("video", videoName))
				continue
			} else {
				return nil, errors.WithStack(err)
			}
		}

		videoDir := filepath.Join(DAVISOption.VideoDir, d.Name())
		video, err := l.loadVideo(videoDir, annoDir)
		if err != nil {
			return nil, errors.WithStack(err)
		}

		videos = append(videos, video)
	}

	return videos, nil
}

func (l *mDAVISLoader) loadVideo(videoDir, annoDir string) (*mDavisVideo, error) {
	fs, err := os.ReadDir(videoDir)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	var jpgFiles []string
	for _, f := range fs {
		if filepath.Ext(f.Name()) == ".jpg" {
			jpgFiles = append(jpgFiles, f.Name())
		}
	}
	sort.Strings(jpgFiles)

	var frames []*mDavisFrame
	for _, jpgFile := range jpgFiles {
		fname := strings.TrimSuffix(jpgFile, ".jpg")

		pngFile := filepath.Join(annoDir, fname+"_fixed.png")
		if _, err := os.Stat(pngFile); err == nil {
			// the fixed png exists and use it
		} else {
			pngFile = filepath.Join(annoDir, fname+".png")
			if _, err := os.Stat(pngFile); err != nil {
				if os.IsNotExist(err) {
					zap.L().Warn("missing annotation file", zap.String("frame", jpgFile))
				}
				return nil, errors.WithStack(err)
			}
		}

		frames = append(frames, &mDavisFrame{
			ImagePath: filepath.Join(videoDir, jpgFile),
			AnnoPath:  pngFile,
		})
	}

	return &mDavisVideo{
		Name:   filepath.Base(videoDir),
		Frames: frames,
	}, nil
}
