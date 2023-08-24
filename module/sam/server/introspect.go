package server

import (
	"context"
	servicev1 "nutsh/proto/gen/service/v1"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func (s *mServer) Introspect(ctx context.Context, req *servicev1.IntrospectRequest) (*servicev1.IntrospectResponse, error) {
	resp, err := s.introspect(ctx, req)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return resp, nil
}

func (s *mServer) introspect(ctx context.Context, req *servicev1.IntrospectRequest) (*servicev1.IntrospectResponse, error) {
	data, err := s.options.script.ReadFile("script/input.js")
	if err != nil {
		return nil, errors.WithStack(err)
	}

	resp := &servicev1.IntrospectResponse{
		DecoderUuid:   s.decoderUuid,
		DecoderFeedJs: string(data),
	}

	return resp, nil
}
