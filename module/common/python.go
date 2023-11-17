package common

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"syscall"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

func RunPython(ctx context.Context, bin string, args ...string) error {
	r := &PythonRuntime{}
	return r.RunPython(ctx, bin, args...)
}

type PythonRuntime struct {
	Env []string
	Dir string
}

func (r *PythonRuntime) RunPython(ctx context.Context, bin string, args ...string) error {
	cmd := exec.Command(bin, args...)
	cmd.Env = r.Env
	if r.Dir != "" {
		cmd.Dir = r.Dir
	}
	zap.L().Debug("running Python script", zap.String("cmd", cmd.String()), zap.Strings("envs", cmd.Env))

	// redirect and monitor stderr of the subprocess
	var cmdStderr bytes.Buffer
	cmd.Stderr = io.MultiWriter(os.Stderr, &cmdStderr)

	// get python runtime message
	var done = make(chan bool)
	var failed = make(chan error)
	go func(cmd *exec.Cmd) {
		if _, err := cmd.Output(); err != nil {
			msg := cmdStderr.String()
			cmdStderr.Reset()
			failed <- errors.Errorf(msg)
		} else {
			done <- true
		}
	}(cmd)

	select {
	case <-done:
		break
	case err := <-failed:
		return err
	case <-ctx.Done():
		if cmd.Process != nil {
			syscall.Kill(cmd.Process.Pid, syscall.SIGKILL)
			return errors.Errorf("process %d timeout", cmd.Process.Pid)
		} else {
			return errors.Errorf("timeout")
		}
	}

	return nil
}
