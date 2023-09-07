package main

import (
	"fmt"
	"net"
	"os"
	"path/filepath"

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"nutsh/module/track/server"
	servicev1 "nutsh/proto/gen/service/v1"
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
					&cli.IntFlag{
						Name:    "gpu",
						Usage:   "id of the GPU to use",
						Value:   0,
						EnvVars: []string{"NUTSH_TRACK_GPU_ID"},
					},
				},
				Action: runStart,
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runStart(ctx *cli.Context) error {
	ser, teardown := server.New(
		server.WithPythonBin(ctx.String("python")),
		server.WithScriptMain(ctx.String("main")),
		server.WithWorkspace(ctx.String("workspace")),
		server.WithGpuId(ctx.Int("gpu")),
	)
	defer teardown()

	// start the server
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize((16 * 1024 * 1024 /* 16M */)),
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
