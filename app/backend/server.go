package backend

import (
	"context"

	"nutsh/app/buildtime"
	"nutsh/openapi/gen/nutshapi"
)

func New(opts ...Option) (nutshapi.StrictServerInterface, error) {
	o := &Options{}
	for _, opt := range opts {
		opt(o)
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}

	s := &mServer{
		options: o,
	}

	return s, nil
}

type mServer struct {
	options *Options
}

func (s *mServer) GetMetadata(ctx context.Context, request nutshapi.GetMetadataRequestObject) (nutshapi.GetMetadataResponseObject, error) {
	return &nutshapi.GetMetadata200JSONResponse{
		CommitIdentifier: buildtime.CommitIdentifier,
		CommitTime:       buildtime.CommitTime,
		Version:          buildtime.Version,
	}, nil
}

func (s *mServer) GetConfig(ctx context.Context, request nutshapi.GetConfigRequestObject) (nutshapi.GetConfigResponseObject, error) {
	return &nutshapi.GetConfig200JSONResponse{
		Config: *s.options.config,
	}, nil
}
