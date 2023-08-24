package localfs

import (
	"context"
	"nutsh/app/storage"
	"os"
	"path"
	"path/filepath"
	"time"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

const tmpFolder = "tmp"
const tmpCleanInterval = 1 * time.Minute
const tmpLifespan = 1 * time.Minute

func NewPublic(root string, urlPrefix string) storage.Public {
	// regularly clean temp files
	go func() {
		dir := filepath.Join(root, tmpFolder)
		for range time.Tick(tmpCleanInterval) {
			cutoff := time.Now().Add(-tmpLifespan)
			clearTempFiles(dir, cutoff)
		}
	}()

	return &mPublic{
		root:      root,
		urlPrefix: urlPrefix,
	}
}

type mPublic struct {
	root      string
	urlPrefix string
}

func (s *mPublic) Put(ctx context.Context, key string, data []byte) (string, error) {
	savePath := path.Join(s.root, key)
	if err := saveFile(savePath, data); err != nil {
		return "", err
	}
	return s.urlPrefix + key, nil
}

func (s *mPublic) PutTemp(ctx context.Context, data []byte) (string, error) {
	// use md5 as key
	name, err := md5Hash(data)
	if err != nil {
		return "", errors.WithStack(err)
	}
	key := filepath.Join(tmpFolder, name)

	// save
	savePath := path.Join(s.root, key)
	if err := saveFile(savePath, data); err != nil {
		return "", err
	}
	return s.urlPrefix + key, nil
}

func (s *mPublic) Check(ctx context.Context, key string) (string, error) {
	savePath := path.Join(s.root, key)
	if _, err := os.Stat(savePath); err != nil {
		if os.IsNotExist(err) {
			// file does not exist
			return "", nil
		} else {
			// some other error
			return "", errors.WithStack(err)
		}
	}

	// file exists
	return s.urlPrefix + key, nil
}

func clearTempFiles(dir string, cutoff time.Time) {
	var victimPaths []string
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Get the creation time of the file
		fileInfo, err := os.Stat(path)
		if err != nil {
			return err
		}

		// If the creation time is before the cutoff, delete the file
		creationTime := fileInfo.ModTime()
		if creationTime.Before(cutoff) {
			victimPaths = append(victimPaths, path)
		}

		return nil
	})
	if err != nil {
		if !os.IsNotExist(err) {
			zap.L().Warn("error in clearing temp files", zap.Error(err))
		}
	}

	for _, path := range victimPaths {
		if err = os.Remove(path); err == nil {
			zap.L().Debug("removed temp file", zap.String("path", path))
		} else {
			zap.L().Warn("failed to remove temp file", zap.String("path", path), zap.Error(err))
		}
	}
}
