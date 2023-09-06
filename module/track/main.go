package main

import (
	"fmt"
	"net"
	"os"

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"nutsh/module/track/server"
	servicev1 "nutsh/proto/gen/service/v1"
)

func main() {
	mustSetupLogger()

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
				},
				Action: runStart,
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runStart(ctx *cli.Context) error {
	ser, teardown := server.New(
		server.WithPython(ctx.String("python")),
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
