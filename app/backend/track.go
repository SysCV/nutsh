package backend

import (
	"context"

	"nutsh/openapi/gen/nutshapi"
	schemav1 "nutsh/proto/gen/schema/v1"
	servicev1 "nutsh/proto/gen/service/v1"

	"github.com/pkg/errors"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func (s *mServer) Track(ctx context.Context, request nutshapi.TrackRequestObject) (nutshapi.TrackResponseObject, error) {
	resp, err := s.track(ctx, request)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return resp, nil
}

func (s *mServer) track(ctx context.Context, request nutshapi.TrackRequestObject) (nutshapi.TrackResponseObject, error) {
	opts := s.options

	addr := opts.trackServerAddr
	if addr == "" {
		return nil, errors.Errorf("missing track server addr")
	}

	// call grpc server
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(16*1024*1024 /* 16M */)),
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer conn.Close()

	client := servicev1.NewTrackServiceClient(conn)

	body := request.Body
	trackReq := &servicev1.TrackRequest{
		FirstImageUrl:       body.FirstFrameUrl,
		SubsequentImageUrls: body.SubsequentFrameUrls,
		FirstImageMask: &schemav1.Mask{
			CocoEncodedRle: body.FirstFrameMask.CocoEncodedRle,
			Size: &schemav1.GridSize{
				Width:  uint32(body.FirstFrameMask.Width),
				Height: uint32(body.FirstFrameMask.Height),
			},
		},
	}
	trackResp, err := client.Track(ctx, trackReq)
	if err != nil {
		return nil, err
	}

	var masks []nutshapi.Mask
	for _, m := range trackResp.GetSubsequentImageMasks() {
		masks = append(masks, nutshapi.Mask{
			CocoEncodedRle: m.CocoEncodedRle,
			Width:          int(m.Size.Width),
			Height:         int(m.Size.Height),
		})
	}

	return &nutshapi.Track200JSONResponse{
		SubsequentFrameMasks: masks,
	}, nil
}
