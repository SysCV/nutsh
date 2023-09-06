package server

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	servicev1 "nutsh/proto/gen/service/v1"
)

func (s *mServer) Track(ctx context.Context, req *servicev1.TrackRequest) (*servicev1.TrackResponse, error) {
	return nil, status.Error(codes.Unimplemented, "not implemented")
}
