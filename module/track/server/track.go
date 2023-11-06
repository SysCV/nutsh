package server

import (
	"context"
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"nutsh/module/common"
	schemav1 "nutsh/proto/gen/go/schema/v1"
	servicev1 "nutsh/proto/gen/go/service/v1"
)

func (s *mServer) Track(ctx context.Context, req *servicev1.TrackRequest) (*servicev1.TrackResponse, error) {
	taskPath, err := s.prepareTask(ctx, req)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer os.Remove(taskPath)
	zap.L().Info("created a track task", zap.String("path", taskPath))

	// call Python
	resultPath := taskPath + ".result.json"
	r := common.PythonRuntime{
		Dir: filepath.Dir(s.options.scriptMain),
	}
	gpuId := s.options.gpuIds.Next()
	main := filepath.Base(s.options.scriptMain)
	err = r.RunPython(ctx, s.options.pythonBin, main,
		"--gpu", fmt.Sprintf("%d", gpuId),
		"--input", taskPath,
		"--output", resultPath,
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer os.Remove(resultPath)

	// load result
	var result struct {
		SubsequentImageMasks []*schemav1.Mask `json:"subsequent_image_masks"`
	}

	f, err := os.Open(resultPath)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer f.Close()

	if err := json.NewDecoder(f).Decode(&result); err != nil {
		return nil, errors.WithStack(err)
	}

	return &servicev1.TrackResponse{
		SubsequentImageMasks: result.SubsequentImageMasks,
	}, nil
}

func (s *mServer) prepareTask(ctx context.Context, req *servicev1.TrackRequest) (string, error) {
	opt := s.options
	workspace := opt.workspace

	// download all images
	saveDir := filepath.Join(workspace, "images")
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return "", errors.WithStack(err)
	}
	imUris := append(req.SubsequentImageUris, req.FirstImageUri)
	imPaths, err := s.prepareImages(ctx, saveDir, imUris)
	if err != nil {
		return "", errors.WithStack(err)
	}

	// save a task
	taskPath, err := s.createTask(ctx, imPaths, req)
	if err != nil {
		return "", errors.WithStack(err)
	}

	return taskPath, nil
}

func (s *mServer) createTask(ctx context.Context, imPaths []string, req *servicev1.TrackRequest) (string, error) {
	workspace := s.options.workspace
	task := struct {
		FirstImagePath       string         `json:"first_image_path"`
		SubsequentImagePaths []string       `json:"subsequent_image_paths"`
		FirstImageMask       *schemav1.Mask `json:"first_image_mask"`
	}{
		FirstImagePath:       imPaths[len(imPaths)-1],
		SubsequentImagePaths: imPaths[:len(imPaths)-1],
		FirstImageMask:       req.FirstImageMask,
	}
	taskId := uuid.NewString()
	taskPath := filepath.Join(workspace, "tasks", taskId+".json")
	if err := os.MkdirAll(filepath.Dir(taskPath), 0755); err != nil {
		return "", errors.WithStack(err)
	}
	taskFile, err := os.Create(taskPath)
	if err != nil {
		return "", errors.WithStack(err)
	}
	defer taskFile.Close()

	if err := json.NewEncoder(taskFile).Encode(&task); err != nil {
		return "", errors.WithStack(err)
	}

	return taskPath, nil
}

func (s *mServer) prepareImages(ctx context.Context, saveDir string, imUris []string) ([]string, error) {
	nj := runtime.NumCPU()

	var wg sync.WaitGroup

	type Result struct {
		Index int
		Path  string
		Err   error
	}

	resChan := make(chan Result, len(imUris))
	semaphore := make(chan struct{}, nj)

	for idx, imUri := range imUris {
		wg.Add(1)
		go func(idx int, imUri string) {
			defer wg.Done()

			select {
			case <-ctx.Done():
				resChan <- Result{
					Index: idx,
					Err:   ctx.Err(),
				}
				return
			case semaphore <- struct{}{}:
			}
			defer func() {
				<-semaphore
			}()

			l := zap.L().With(zap.Int("idx", idx))
			im := &mImage{uri: imUri, ctx: ctx, l: l}
			imPath, err := im.prepare(saveDir)
			if err != nil {
				l.Error("failed to prepare image", zap.Error(err))
			} else {
				l.Info("prepared image", zap.String("path", imPath))
			}

			resChan <- Result{
				Index: idx,
				Path:  imPath,
				Err:   err,
			}
		}(idx, imUri)
	}

	wg.Wait()
	close(resChan)
	close(semaphore)

	paths := make([]string, len(imUris))
	for res := range resChan {
		if res.Err != nil {
			return nil, res.Err
		}
		paths[res.Index] = res.Path
	}

	return paths, nil
}

const (
	base64JpegPrefix = "data:image/jpeg;base64,"
	base64PngPrefix  = "data:image/png;base64,"
)

type mImage struct {
	ctx context.Context
	uri string
	l   *zap.Logger
}

func (m *mImage) prepare(saveDir string) (string, error) {
	m.l.Info("preparing image")

	hash := md5.Sum([]byte(m.uri))
	name := fmt.Sprintf("%x", hash)
	path := filepath.Join(saveDir, name) + m.ext()

	if _, err := os.Stat(path); err == nil {
		return path, nil
	} else if !os.IsNotExist(err) {
		return "", errors.WithStack(err)
	}

	for _, prefix := range []string{base64JpegPrefix, base64PngPrefix} {
		if !strings.HasPrefix(m.uri, prefix) {
			continue
		}

		imBase64 := m.uri[len(prefix):]
		if err := m.saveBase64(path, imBase64); err != nil {
			return "", err
		}
		return path, nil
	}

	if err := m.download(path); err != nil {
		return "", err
	}

	return path, nil
}

func (m *mImage) ext() string {
	if strings.HasPrefix(m.uri, base64JpegPrefix) {
		return ".jpg"
	}
	if strings.HasPrefix(m.uri, base64PngPrefix) {
		return ".png"
	}
	return filepath.Ext(m.uri)
}

func (m *mImage) saveBase64(savePath string, imBase64 string) error {
	m.l.Info("saving base64 image", zap.String("path", savePath))

	im, err := base64.StdEncoding.DecodeString(imBase64)
	if err != nil {
		return errors.WithStack(err)
	}
	if err := os.WriteFile(savePath, im, 0644); err != nil {
		return errors.WithStack(err)
	}

	return nil
}

func (m *mImage) download(savePath string) error {
	m.l.Info("downloading image", zap.String("url", m.uri), zap.String("path", savePath))

	req, err := http.NewRequest("GET", m.uri, nil)
	if err != nil {
		return errors.WithStack(err)
	}
	req = req.WithContext(m.ctx)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return errors.WithStack(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errors.Errorf("failed to download %s, status code: %d", m.uri, resp.StatusCode)
	}

	f, err := os.Create(savePath)
	if err != nil {
		return errors.WithStack(err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return errors.WithStack(err)
	}

	return nil
}
