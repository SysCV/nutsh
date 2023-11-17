package sam

import (
	"context"
	"io"
	"net/http"
	"time"

	"github.com/pkg/errors"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	servicev1 "nutsh/proto/gen/go/service/v1"
)

func Hit(ctx *cli.Context) error {
	// introspect to get uuid
	introspectResp, err := introspect(ctx)
	if err != nil {
		return errors.WithStack(err)
	}
	decoderUuid := introspectResp.GetDecoderUuid()

	imageUrl := ctx.String("image")
	zap.L().Info("downloading image", zap.String("url", imageUrl))
	image, err := downloadImage(ctx.Context, imageUrl)
	if err != nil {
		return err
	}

	req := &servicev1.EmbedImageRequest{
		OriginalImage: image,
		DecoderUuid:   decoderUuid,
	}

	// concurrently embed
	type mResult struct {
		Cost  time.Duration
		Error error
	}
	ch := make(chan *mResult)
	n := ctx.Int("count")
	for i := 0; i < n; i++ {
		go func() {
			start := time.Now()
			_, err := embedImage(ctx, req)
			ch <- &mResult{
				Cost:  time.Since(start),
				Error: err,
			}
		}()
	}

	for i := 0; i < n; i++ {
		res := <-ch
		if err := res.Error; err != nil {
			zap.L().Info("failed", zap.Duration("cost", res.Cost), zap.Error(err))
		} else {
			zap.L().Info("succeeded", zap.Duration("cost", res.Cost))
		}
	}

	return nil
}

func introspect(ctx *cli.Context) (*servicev1.IntrospectResponse, error) {
	// gRPC client
	addr := ctx.String("address")
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer conn.Close()
	client := servicev1.NewOnlineSegmentationServiceClient(conn)

	// introspect
	resp, err := client.Introspect(ctx.Context, &servicev1.IntrospectRequest{})
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return resp, nil
}

func embedImage(ctx *cli.Context, req *servicev1.EmbedImageRequest) (*servicev1.EmbedImageResponse, error) {
	// gRPC client
	addr := ctx.String("address")
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(8*1024*1024 /* 8M */)),
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer conn.Close()
	client := servicev1.NewOnlineSegmentationServiceClient(conn)

	// set timeout
	ctx2, cancel := context.WithTimeout(ctx.Context, ctx.Duration("timeout"))
	defer cancel()

	// embed
	resp, err := client.EmbedImage(ctx2, req)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return resp, nil
}

func downloadImage(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	req = req.WithContext(ctx)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer resp.Body.Close()

	im, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	return im, nil
}
