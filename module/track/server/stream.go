package server

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	servicev1 "nutsh/proto/gen/service/v1"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func (s *mServer) TrackStream(req *servicev1.TrackRequest, stream servicev1.TrackService_TrackStreamServer) error {
	ctx := stream.Context()

	opt := s.options
	taskPath, err := s.prepareTask(ctx, req)
	if err != nil {
		return errors.WithStack(err)
	}
	defer os.Remove(taskPath)
	zap.L().Info("created a track task", zap.String("path", taskPath))

	// call Python with printing results to stdout
	main := filepath.Base(opt.scriptMain)
	cmd := exec.Command(opt.pythonBin, main,
		"--gpu", fmt.Sprintf("%d", opt.gpuId),
		"--input", taskPath,
	)
	cmd.Dir = filepath.Dir(opt.scriptMain)
	cmd.Stderr = os.Stderr

	// capture script's stdout
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return errors.WithStack(err)
	}

	// start
	if err := cmd.Start(); err != nil {
		return errors.WithStack(err)
	}

	// scan stdout
	scanner := bufio.NewScanner(stdout)

	for scanner.Scan() {
		maskJson := scanner.Bytes()

		var mask servicev1.FrameMask
		if err := json.NewDecoder(bytes.NewBuffer(maskJson)).Decode(&mask); err != nil {
			zap.L().Warn("failed to decode mask json", zap.ByteString("stdout", maskJson))
		} else {
			zap.L().Info("sent a mask", zap.Uint32("frame", mask.FrameIndex))
			stream.Send(&mask)
		}
	}

	// when the script terminates its stdout will be closed and we will reach here
	if err := scanner.Err(); err != nil {
		return errors.WithStack(err)
	}

	return nil
}
