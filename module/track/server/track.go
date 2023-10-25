package server

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"nutsh/module/common"
	schemav1 "nutsh/proto/gen/schema/v1"
	servicev1 "nutsh/proto/gen/service/v1"
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
	imUrls := append(req.SubsequentImageUrls, req.FirstImageUrl)
	imPaths, err := s.downloadImages(ctx, saveDir, imUrls)
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

func (s *mServer) downloadImages(ctx context.Context, saveDir string, imUrls []string) ([]string, error) {
	nj := runtime.NumCPU()

	var wg sync.WaitGroup

	type Result struct {
		Index int
		Path  string
		Err   error
	}

	resChan := make(chan Result, len(imUrls))
	semaphore := make(chan struct{}, nj)

	for idx, imUrl := range imUrls {
		wg.Add(1)
		go func(idx int, imUrl string) {
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

			l := zap.L().With(zap.String("url", imUrl))
			l.Info("downloading image")
			imPath, err := s.downloadImage(ctx, saveDir, imUrl)
			if err != nil {
				l.Info("downloaded image", zap.Error(err))
			} else {
				l.Info("downloaded image", zap.String("path", imPath))
			}

			resChan <- Result{
				Index: idx,
				Path:  imPath,
				Err:   err,
			}
		}(idx, imUrl)
	}

	wg.Wait()
	close(resChan)
	close(semaphore)

	paths := make([]string, len(imUrls))
	for res := range resChan {
		if res.Err != nil {
			return nil, res.Err
		}
		paths[res.Index] = res.Path
	}

	return paths, nil
}

func (s *mServer) downloadImage(ctx context.Context, saveDir string, imUrl string) (string, error) {
	hash := md5.Sum([]byte(imUrl))
	name := fmt.Sprintf("%x", hash)
	path := filepath.Join(saveDir, name) + filepath.Ext(imUrl)

	if _, err := os.Stat(path); err == nil {
		return path, nil
	} else if !os.IsNotExist(err) {
		return "", errors.WithStack(err)
	}

	req, err := http.NewRequest("GET", imUrl, nil)
	if err != nil {
		return "", errors.WithStack(err)
	}
	req = req.WithContext(ctx)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", errors.WithStack(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", errors.Errorf("failed to download %s, status code: %d", imUrl, resp.StatusCode)
	}

	f, err := os.Create(path)
	if err != nil {
		return "", errors.WithStack(err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return "", errors.WithStack(err)
	}

	return path, nil
}
