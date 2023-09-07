package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.uber.org/zap"

	"nutsh/module/common"
	servicev1 "nutsh/proto/gen/service/v1"
)

func (s *mServer) EmbedImage(ctx context.Context, req *servicev1.EmbedImageRequest) (*servicev1.EmbedImageResponse, error) {
	resp, err := s.embedImage(ctx, req)
	if err != nil {
		zap.L().Error("error", zap.Error(err))
		return nil, err
	}
	return resp, nil
}

func (s *mServer) embedImage(ctx context.Context, req *servicev1.EmbedImageRequest) (*servicev1.EmbedImageResponse, error) {
	decoderUuid := req.GetDecoderUuid()
	if decoderUuid != s.decoderUuid {
		return nil, errors.Errorf("unaccepted decoder uuid %s (availables are: [%s])", decoderUuid, s.decoderUuid)
	}

	// create a temporary folder
	workDir, err := os.MkdirTemp("", "*")
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer os.RemoveAll(workDir)

	// save the original file
	f, err := os.CreateTemp(workDir, "*")
	if err != nil {
		return nil, errors.WithStack(err)
	}
	original := req.GetOriginalImage()
	if err := saveFile(f, original); err != nil {
		return nil, err
	}

	// send the http reqeust
	inPath := f.Name()
	outPath := inPath + ".npy"
	cropStr := ""
	if crop := req.GetCrop(); crop != nil && crop.Width > 0 && crop.Height > 0 {
		cropStr = fmt.Sprintf("%d,%d,%d,%d", crop.X, crop.Y, crop.Width, crop.Height)
	}

	if err := s.sendEmbedImageRequest(ctx, map[string]string{
		"input":  inPath,
		"output": outPath,
		"crop":   cropStr,
	}); err != nil {
		return nil, err
	}

	// read output
	output, err := os.ReadFile(outPath)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	resp := &servicev1.EmbedImageResponse{
		EmbeddedImageNpy: output,
	}

	return resp, nil
}

func (s *mServer) sendEmbedImageRequest(ctx context.Context, body map[string]string) error {
	respChan := make(chan *mEmbedResponse)
	req := &mEmbedRequest{
		Uuid:     uuid.NewString(),
		Context:  ctx,
		Body:     body,
		RespChan: respChan,
	}

	logger := zap.L().With(zap.String("uuid", req.Uuid))
	logger.Info("queued embed request")
	select {
	case s.embedReqQueue <- req:
		logger.Info("sent embed request")

		resp := <-respChan
		logger.Info("received embed response")
		if resp.Error != nil {
			return resp.Error
		}
		if code := resp.Response.StatusCode; code != 200 {
			return errors.Errorf("unexpected HTTP status code %d", code)
		}
		return nil
	case <-ctx.Done():
		logger.Info("queueing timeout")
		return ctx.Err()
	}
}

type mEmbedRequest struct {
	Uuid     string
	Context  context.Context
	Body     map[string]string
	RespChan chan *mEmbedResponse
}

type mEmbedResponse struct {
	Response *http.Response
	Error    error
}

func (s *mServer) mustStartEmbedServer(device string) {
	data, err := s.options.script.ReadFile("script/embed_server.py")
	if err != nil {
		zap.L().Fatal(err.Error())
	}
	device = common.FormatDevice(device)

	// find a free port
	port, err := freePort()
	if err != nil {
		zap.L().Fatal(err.Error())
	}

	go func() {
		zap.L().Info("started embed server", zap.String("device", device), zap.Int("port", port))
		ctx := context.Background()
		err = common.RunPython(ctx,
			s.options.pythonBin,
			"-c", string(data),
			"--model-checkpoint", s.options.encoderCheckpoint,
			"--model-type", s.options.encoderType,
			"--device", device,
			"--port", strconv.Itoa(port),
			"--log-prefix", strconv.Itoa(port),
		)
		if err != nil {
			zap.L().Fatal(err.Error())
		}
	}()

	// serve embed request
	ch := make(chan *mEmbedRequest)
	go s.serveEmbedRequest(port, ch)
}

func (s *mServer) serveEmbedRequest(port int, ch chan *mEmbedRequest) {
	logger := zap.L().With(zap.Int("port", port))
	for {
		s.embedServerPool <- ch
		logger.Info("enqueued embedder")

		req := <-ch
		l := logger.With(zap.String("uuid", req.Uuid))
		l.Info("met embed request")

		ctx, body := req.Context, req.Body
		resp, err := s.requestEmbed(ctx, body, port)
		req.RespChan <- &mEmbedResponse{
			Response: resp,
			Error:    err,
		}
		l.Info("finished embed request")
	}
}

func (s *mServer) listenEmbedRequest() {
	for req := range s.embedReqQueue {
		logger := zap.L().With(zap.String("uuid", req.Uuid))
		logger.Info("dequeued embed request")
		select {
		case ch := <-s.embedServerPool:
			logger.Info("found embedder")
			ch <- req
		case <-req.Context.Done():
			logger.Info("waiting for embedder timeout")
			req.RespChan <- &mEmbedResponse{
				Error: req.Context.Err(),
			}
		}
	}
}

func (s *mServer) requestEmbed(ctx context.Context, body map[string]string, port int) (*http.Response, error) {
	// prepare body
	bodyJson, err := json.Marshal(body)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	// prepare request
	url := fmt.Sprintf("http://127.0.0.1:%d/embed", port)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyJson))
	if err != nil {
		return nil, errors.WithStack(err)
	}
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")
	req = req.WithContext(ctx)

	// send request
	client := http.DefaultClient
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	// done
	return resp, nil
}
