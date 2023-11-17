package main

import (
	"fmt"
	"net"
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"nutsh/module/track/server"
	servicev1 "nutsh/proto/gen/go/service/v1"
)

func main() {
	mustSetupLogger()

	homeDir, err := os.UserHomeDir()
	mustOk(err)
	defaultWorkspace := filepath.Join(homeDir, ".nutsh", "track-workspace")

	app := &cli.App{
		Name:  "nutsh-track",
		Usage: "Automatically track objects",
		Commands: []*cli.Command{
			{
				Name:  "start",
				Usage: "Start the server",
				Flags: []cli.Flag{
					&cli.IntFlag{
						Name:    "port",
						Usage:   "gRPC port to listen",
						Value:   12347,
						EnvVars: []string{"NUTSH_TRACK_PORT"},
					},
					&cli.StringFlag{
						Name:    "python",
						Usage:   "command to run Python",
						Value:   "python",
						EnvVars: []string{"NUTSH_TRACK_PYTHON"},
					},
					&cli.StringFlag{
						Name:     "main",
						Usage:    "path to the entry of the script",
						Required: true,
						EnvVars:  []string{"NUTSH_TRACK_MAIN"},
					},
					&cli.StringFlag{
						Name:    "workspace",
						Usage:   "path to a directory for storing working data",
						Value:   defaultWorkspace,
						EnvVars: []string{"NUTSH_TRACK_WORKSPACE"},
					},
					&cli.IntSliceFlag{
						Name:    "gpus",
						Usage:   "gpu ids to run the model",
						Value:   cli.NewIntSlice(0),
						EnvVars: []string{"NUTSH_TRACK_GPUS"},
					},
					&cli.IntFlag{
						Name:    "grpc-max-recv-msg-size",
						Usage:   "the max message size in bytes the server can receive",
						Value:   1024 * 1024 * 1024, // allows 1K images each being of 1MB
						EnvVars: []string{"NUTSH_GRPC_MAX_RECV_MSG_SIZE"},
					},
				},
				Action: runStart,
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runStart(ctx *cli.Context) error {
	gpuIds := ctx.IntSlice("gpus")
	if len(gpuIds) == 0 {
		return errors.Errorf("missing gpus")
	}

	ser, teardown := server.New(
		server.WithPythonBin(ctx.String("python")),
		server.WithScriptMain(ctx.String("main")),
		server.WithWorkspace(ctx.String("workspace")),
		server.WithGpuIds(gpuIds),
	)
	defer teardown()

	// start the server
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(ctx.Int("grpc-max-recv-msg-size")),
	)
	servicev1.RegisterTrackServiceServer(grpcServer, ser)

	addr := fmt.Sprintf(":%d", ctx.Int("port"))
	zap.L().Info("listening on " + addr)
	lis, err := net.Listen("tcp", addr)
	mustOk(err)
	grpcServer.Serve(lis)

	return nil
}

func mustSetupLogger() *zap.Logger {
	logger, err := zap.NewProduction()
	mustOk(err)

	zap.ReplaceGlobals(logger)
	return logger
}

func mustOk(err error) {
	if err == nil {
		return
	}
	if os.Getenv("DEBUG") != "" {
		fmt.Printf("%+v\n", err)
	} else {
		fmt.Printf("%v\n", err)
	}
	os.Exit(1)
}
