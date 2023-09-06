package backend

import (
	"context"

	"github.com/pkg/errors"

	"nutsh/openapi/gen/nutshapi"
)

func (s *mServer) Track(ctx context.Context, request nutshapi.TrackRequestObject) (nutshapi.TrackResponseObject, error) {
	return nil, errors.Errorf("not implemented")
}
