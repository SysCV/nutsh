package backend

import (
	"context"
	"fmt"
	"nutsh/openapi/gen/nutshapi"

	"go.uber.org/zap"
)

func (s *mServer) CreateProjectSample(ctx context.Context, request nutshapi.CreateProjectSampleRequestObject) (nutshapi.CreateProjectSampleResponseObject, error) {
	pid := request.ProjectId
	key := fmt.Sprintf("project_%s", pid)
	err := s.options.storageSample.Create(ctx, key, request.Body)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.CreateProjectSample200JSONResponse{}, nil
}
