package backend

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"nutsh/openapi/gen/nutshapi"
	schemav1 "nutsh/proto/gen/schema/v1"
	servicev1 "nutsh/proto/gen/service/v1"

	"github.com/labstack/echo/v4"
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
	conn, err := s.makeTrackGrpcConnection()
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	client := servicev1.NewTrackServiceClient(conn)
	trackReq := makeTrackGrpcRequest(request)
	trackResp, err := client.Track(ctx, trackReq)
	if err != nil {
		return nil, err
	}

	var masks []nutshapi.Mask
	for _, m := range trackResp.GetSubsequentImageMasks() {
		masks = append(masks, maskProtoToOpenApi(m))
	}

	return &nutshapi.Track200JSONResponse{
		SubsequentFrameMasks: masks,
	}, nil
}

type FrameMask struct {
	FrameIndex uint32        `json:"frame_index"`
	Mask       nutshapi.Mask `json:"mask"`
}

// For streaming response, check
// https://echo.labstack.com/docs/cookbook/streaming-response
func (s *mServer) TrackStream(c echo.Context) error {
	var body nutshapi.TrackJSONRequestBody
	if err := c.Bind(&body); err != nil {
		return errors.WithStack(err)
	}
	request := nutshapi.TrackRequestObject{Body: &body}

	conn, err := s.makeTrackGrpcConnection()
	if err != nil {
		return err
	}
	defer conn.Close()

	client := servicev1.NewTrackServiceClient(conn)
	req := makeTrackGrpcRequest(request)
	respStream, err := client.TrackStream(c.Request().Context(), req)
	if err != nil {
		return err
	}

	c.Response().Header().Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	c.Response().WriteHeader(http.StatusOK)
	enc := json.NewEncoder(c.Response())
	for {
		mask, err := respStream.Recv()
		if err == io.EOF {
			break
		}
		if err != nil {
			return errors.WithStack(err)
		}

		frameMask := FrameMask{
			FrameIndex: mask.FrameIndex,
			Mask:       maskProtoToOpenApi(mask.Mask),
		}
		if err := enc.Encode(frameMask); err != nil {
			return errors.WithStack(err)
		}
		c.Response().Flush()
		zap.L().Info("streamed a mask", zap.Uint32("frame", mask.FrameIndex))
	}
	return nil
}

func (s *mServer) makeTrackGrpcConnection() (*grpc.ClientConn, error) {
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

	return conn, nil
}

func makeTrackGrpcRequest(request nutshapi.TrackRequestObject) *servicev1.TrackRequest {
	body := request.Body
	return &servicev1.TrackRequest{
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
}

func maskProtoToOpenApi(m *schemav1.Mask) nutshapi.Mask {
	return nutshapi.Mask{
		CocoEncodedRle: m.CocoEncodedRle,
		Width:          int(m.Size.Width),
		Height:         int(m.Size.Height),
	}
}
