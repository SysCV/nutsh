package localfs

import (
	"context"
	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
	"path"

	"github.com/pkg/errors"
)

func NewSample(root string) storage.Sample {
	return &mSample{
		root: root,
	}
}

type mSample struct {
	root string
}

func (s *mSample) Create(ctx context.Context, pid storage.ProjectId, req *nutshapi.CreateProjectSampleReq) error {
	data := []byte(req.SampleJson)

	// use md5 as filename
	name, err := md5Hash(data)
	if err != nil {
		return errors.WithStack(err)
	}
	fname := name + ".json"

	// save
	savePath := path.Join(s.root, pid, fname)
	if err := saveFile(savePath, data); err != nil {
		return err
	}

	return nil
}
