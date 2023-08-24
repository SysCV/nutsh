package server

import (
	"context"
	servicev1 "nutsh/proto/gen/service/v1"
	"os"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func (s *mServer) GetDecoder(ctx context.Context, req *servicev1.GetDecoderRequest) (*servicev1.GetDecoderResponse, error) {
	resp, err := s.getDecoder(ctx, req)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return resp, nil
}

func (s *mServer) getDecoder(ctx context.Context, req *servicev1.GetDecoderRequest) (*servicev1.GetDecoderResponse, error) {
	output, err := os.ReadFile(s.options.decoderPath)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	resp := &servicev1.GetDecoderResponse{
		DecoderOnnx: output,
		Uuid:        s.decoderUuid,
	}

	return resp, nil
}
