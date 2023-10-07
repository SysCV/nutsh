package backend

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"nutsh/openapi/gen/nutshapi"
	schemav1 "nutsh/proto/gen/schema/v1"
	servicev1 "nutsh/proto/gen/service/v1"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func (s *mServer) GetOnlineSegmentation(ctx context.Context, request nutshapi.GetOnlineSegmentationRequestObject) (nutshapi.GetOnlineSegmentationResponseObject, error) {
	resp, err := s.getOnlineSegmentation(ctx, request)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return resp, nil
}

func (s *mServer) getOnlineSegmentation(ctx context.Context, request nutshapi.GetOnlineSegmentationRequestObject) (nutshapi.GetOnlineSegmentationResponseObject, error) {
	opts := s.options
	store := opts.storagePublic

	addr := opts.onlineSegmentationServerAddr
	if addr == "" {
		return &nutshapi.GetOnlineSegmentation200JSONResponse{}, nil
	}

	// introspect
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(16*1024*1024 /* 16M */)),
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer conn.Close()

	client := servicev1.NewOnlineSegmentationServiceClient(conn)
	introspectResp, err := client.Introspect(ctx, &servicev1.IntrospectRequest{})
	if err != nil {
		return nil, err
	}

	decoderUuid := introspectResp.GetDecoderUuid()
	decoderFeedJs := introspectResp.GetDecoderFeedJs()

	// check if the modal has already been saved
	relPath := path.Join("model", "online_segmentation", fmt.Sprintf("%s.onnx", decoderUuid))
	if url, err := store.Check(ctx, relPath); err != nil {
		return nil, err
	} else if url != "" {
		zap.L().Info("object already exists in the public store", zap.String("key", relPath))
		return &nutshapi.GetOnlineSegmentation200JSONResponse{
			Decoder: &nutshapi.OnlineSegmentationDecoder{
				Url:    url,
				Uuid:   decoderUuid,
				FeedJs: decoderFeedJs,
			},
		}, nil
	}

	// retrieve and save the model for the first time
	resp, err := client.GetDecoder(ctx, &servicev1.GetDecoderRequest{})
	if err != nil {
		return nil, errors.WithStack(err)
	}

	if resp.GetUuid() != decoderUuid {
		// unexpected inconsistency
		return nil, errors.Errorf("expect to get decoder with UUID %s, but got %s", decoderUuid, resp.GetUuid())
	}

	// save the decoder to the public folder
	decoder := resp.GetDecoderOnnx()
	url, err := store.Put(ctx, relPath, decoder)
	if err != nil {
		return nil, err
	}

	return &nutshapi.GetOnlineSegmentation200JSONResponse{
		Decoder: &nutshapi.OnlineSegmentationDecoder{
			Url:    url,
			Uuid:   decoderUuid,
			FeedJs: decoderFeedJs,
		},
	}, nil
}

func (s *mServer) GetOnlineSegmentationEmbedding(ctx context.Context, request nutshapi.GetOnlineSegmentationEmbeddingRequestObject) (nutshapi.GetOnlineSegmentationEmbeddingResponseObject, error) {
	resp, err := s.onlineSegmentationEmbed(ctx, request)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return resp, nil
}

func (s *mServer) onlineSegmentationEmbed(ctx context.Context, request nutshapi.GetOnlineSegmentationEmbeddingRequestObject) (nutshapi.GetOnlineSegmentationEmbeddingResponseObject, error) {
	opts := s.options
	store := opts.storagePublic

	addr := opts.onlineSegmentationServerAddr
	if addr == "" {
		return &nutshapi.GetOnlineSegmentationEmbedding400JSONResponse{
			ErrorCode: ErrOnlineSegmentationDisabled().Error(),
		}, nil
	}

	decoderUuid := request.Params.DecoderUuid
	if decoderUuid == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "missing decoder uuid")
	}

	var x, y, w, h uint32
	if crop := request.Params.Crop; crop != nil {
		if crop.X < 0 || crop.Y < 0 || crop.Width < 0 || crop.Height < 0 {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "invalid crop")
		}
		x = uint32(crop.X)
		y = uint32(crop.Y)
		w = uint32(crop.Width)
		h = uint32(crop.Height)
	}
	hasCrop := (w > 0 && h > 0)

	imUrl := request.Params.ImageUrl
	im, err := s.loadImage(ctx, imUrl)
	if err != nil {
		return nil, err
	}
	zap.L().Info("downloaded image", zap.String("url", imUrl), zap.Int("size", len(im)))

	// check cache if no cropping is presented
	var key string
	if !hasCrop {
		imd5 := md5String(im)
		key = fmt.Sprintf("embed/%s.%s.npy", imd5, decoderUuid)
		if url, err := store.Check(ctx, key); err != nil {
			return nil, err
		} else if url != "" {
			zap.L().Info("object already exists in the public store", zap.String("key", key))
			return &nutshapi.GetOnlineSegmentationEmbedding200JSONResponse{
				EmbeddingUrl: url,
			}, nil
		}
	}

	// call the grpc server
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(16*1024*1024 /* 16M */)),
	)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer conn.Close()

	zap.L().Info("sending embed image request")
	client := servicev1.NewOnlineSegmentationServiceClient(conn)
	resp, err := client.EmbedImage(ctx, &servicev1.EmbedImageRequest{
		OriginalImage: im,
		DecoderUuid:   decoderUuid,
		Crop: &schemav1.GridRect{
			X:      x,
			Y:      y,
			Width:  w,
			Height: h,
		},
	})
	if err != nil {
		return nil, err
	}
	embedded := resp.GetEmbeddedImageNpy()

	var url string
	if key != "" {
		url, err = store.Put(ctx, key, embedded)
		if err != nil {
			return nil, err
		}
	} else {
		url, err = store.PutTemp(ctx, embedded)
		if err != nil {
			return nil, err
		}
	}

	return &nutshapi.GetOnlineSegmentationEmbedding200JSONResponse{
		EmbeddingUrl: url,
	}, nil
}

func (s *mServer) loadImage(ctx context.Context, url string) ([]byte, error) {
	dataPrefix := "data://"
	if strings.HasPrefix(url, dataPrefix) {
		// the image should be loaded from data dir
		relPath := strings.TrimPrefix(url, dataPrefix)
		dir := s.options.dataDir
		if dir == "" {
			return nil, errors.Errorf("missing data dir to load local image [%s]", relPath)
		}
		fpath := filepath.Join(dir, relPath)
		data, err := os.ReadFile(fpath)
		if err != nil {
			return nil, errors.WithStack(err)
		}
		return data, nil
	}
	return downloadImage(ctx, url)
}

func downloadImage(ctx context.Context, url string) ([]byte, error) {
	zap.L().Info("downloading image", zap.String("url", url))

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

func md5String(data []byte) string {
	h := md5.New()
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}
