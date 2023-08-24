package cmd

import (
	"context"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func newS3Uploader(ctx context.Context) (*mS3Uploader, error) {
	awscfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	if region := SaveOption.S3.Region; region != "" {
		awscfg.Region = region
	}
	s3c := s3.NewFromConfig(awscfg)
	uploader := manager.NewUploader(s3c)
	return &mS3Uploader{
		Uploader: uploader,
	}, nil
}

type mS3Uploader struct {
	Uploader *manager.Uploader
}

func (u *mS3Uploader) Upload(ctx context.Context, filePath string, key string) (string, error) {
	zap.L().Info("uploading file", zap.String("path", filePath), zap.String("key", key))

	f, err := os.Open(filePath)
	if err != nil {
		return "", errors.WithStack(err)
	}
	defer f.Close()

	key = filepath.Join(SaveOption.S3.KeyPrefix, key)
	result, err := u.Uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket: aws.String(SaveOption.S3.Bucket),
		Key:    aws.String(key),
		Body:   f,
	})
	if err != nil {
		return "", errors.WithStack(err)
	}
	return result.Location, nil
}
