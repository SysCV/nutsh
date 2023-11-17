package main

import (
	"embed"
	"fmt"
	"net"
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"nutsh/module/common"
	"nutsh/module/sam/server"
	servicev1 "nutsh/proto/gen/go/service/v1"
)

//go:embed script/*
var script embed.FS

//go:embed requirements.txt
var requirementsTxt embed.FS

var commonFlags = []cli.Flag{
	&cli.StringFlag{
		Name:    "python",
		Usage:   "command to run Python",
		Value:   "python",
		EnvVars: []string{"NUTSH_SAM_PYTHON"},
	},
	&cli.StringFlag{
		Name:     "model-type",
		Usage:    "type of the SAM encoder in [vit_b, vit_l, vit_h]",
		Required: true,
		EnvVars:  []string{"NUTSH_SAM_MODEL_TYPE"},
	},
	&cli.StringFlag{
		Name:     "model-checkpoint",
		Usage:    "path to the encoder checkpoint",
		Required: true,
		EnvVars:  []string{"NUTSH_SAM_MODEL_CHECKPOINT"},
	},
	&cli.StringFlag{
		Name:     "decoder-path",
		Usage:    "path to the decoder onnx file",
		Required: true,
		EnvVars:  []string{"NUTSH_SAM_DECODER_PATH"},
	},
}

func main() {
	mustSetupLogger()

	app := &cli.App{
		Name:  "nutsh-sam",
		Usage: "Assist segmentation using the Segment Anything Model",
		Commands: []*cli.Command{
			{
				Name:  "start",
				Usage: "Start the server",
				Flags: append(commonFlags,
					&cli.IntFlag{
						Name:    "port",
						Usage:   "gRPC port to listen",
						Value:   12345,
						EnvVars: []string{"NUTSH_SAM_PORT"},
					},
					&cli.StringSliceFlag{
						Name:    "devices",
						Usage:   "devices to serve the encoder",
						Value:   cli.NewStringSlice("cpu"),
						EnvVars: []string{"NUTSH_SAM_DEVICES"},
					}),
				Action: runStart,
			},
			{
				Name:   "quantize",
				Usage:  "Quantize a pre-trained decoder",
				Flags:  commonFlags,
				Action: runQuantize,
			},
			{
				Name:  "finetune",
				Usage: "Fine-tune a pre-trained decoder",
				Flags: append(commonFlags,
					&cli.StringFlag{
						Name:    "device",
						Usage:   "device to run the encoder",
						Value:   "cpu",
						EnvVars: []string{"NUTSH_SAM_DEVICE"},
					},
					&cli.StringFlag{
						Name:     "sample-dir",
						Usage:    "path to the directory of sample JSONs",
						Required: true,
						EnvVars:  []string{"NUTSH_SAM_SAMPLE_DIR"},
					},
					&cli.StringFlag{
						Name:     "workspace",
						Usage:    "path to a directory for storing working data",
						Required: true,
						EnvVars:  []string{"NUTSH_SAM_WORKSPACE"},
					},
					&cli.Float64Flag{
						Name:    "lr",
						Usage:   "learning rate",
						Value:   1e-4,
						EnvVars: []string{"NUTSH_SAM_LR"},
					},
					&cli.Float64Flag{
						Name:    "wd",
						Usage:   "weight decay",
						Value:   0,
						EnvVars: []string{"NUTSH_SAM_WD"},
					},
					&cli.IntFlag{
						Name:    "num-epoch",
						Usage:   "number of epoch",
						Value:   10,
						EnvVars: []string{"NUTSH_SAM_NUM_EPOCH"},
					},
				),
				Action: runFinetune,
			},
			{
				Name:   "requirements",
				Usage:  "Display the runtime Python requirements",
				Action: runPrintRequirements,
			},
			{
				Name:  "eject",
				Usage: "Extracts the Python scripts for additional customization",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "dir",
						Usage:   "directory to save ejected files",
						EnvVars: []string{"NUTSH_SAM_DIR"},
					},
				},
				Action: runEject,
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runStart(ctx *cli.Context) error {
	decoderPath := ctx.String("decoder-path")
	if _, err := os.Stat(decoderPath); err != nil {
		if os.IsNotExist(err) {
			// decoder does not exist
			zap.L().Info("decoder not found and will generate one")
			if err := runQuantize(ctx); err != nil {
				return errors.WithStack(err)
			}
		} else {
			// some other error
			return errors.WithStack(err)
		}
	} else {
		zap.L().Info("decoder found and will skip generating one")
	}

	ser, teardown := server.New(
		server.WithDevices(ctx.StringSlice("devices")),
		server.WithModel(ctx.String("model-type"), ctx.String("model-checkpoint"), ctx.String("decoder-path")),
		server.WithPython(ctx.String("python")),
		server.WithScript(script),
	)
	defer teardown()

	// start the server
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize((16 * 1024 * 1024 /* 16M */)),
	)
	servicev1.RegisterOnlineSegmentationServiceServer(grpcServer, ser)

	addr := fmt.Sprintf(":%d", ctx.Int("port"))
	zap.L().Info("listening on " + addr)
	lis, err := net.Listen("tcp", addr)
	mustOk(err)
	grpcServer.Serve(lis)

	return nil
}

func runQuantize(ctx *cli.Context) error {
	data, err := script.ReadFile("script/quantize.py")
	if err != nil {
		return errors.WithStack(err)
	}

	err = common.RunPython(ctx.Context,
		ctx.String("python"),
		"-c", string(data),
		"--model-type", ctx.String("model-type"),
		"--checkpoint", ctx.String("model-checkpoint"),
		"--output", ctx.String("decoder-path"),
	)
	if err != nil {
		return errors.WithStack(err)
	}

	return nil
}

func runFinetune(ctx *cli.Context) error {
	// create a temporary folder to eject files and run
	workDir, err := os.MkdirTemp("", "*")
	if err != nil {
		return errors.WithStack(err)
	}
	defer os.RemoveAll(workDir)

	scriptDir := filepath.Join(workDir, "script")
	if err := os.MkdirAll(scriptDir, 0755); err != nil {
		return errors.WithStack(err)
	}
	if err := ejectScript("finetune.py", scriptDir); err != nil {
		return err
	}
	if err := ejectScript("quantize.py", scriptDir); err != nil {
		return err
	}
	if err := ejectScript("__init__.py", scriptDir); err != nil {
		return err
	}

	r := &common.PythonRuntime{
		Env: []string{"PYTHONPATH=" + workDir},
	}

	device := common.FormatDevice(ctx.String("device"))
	err = r.RunPython(ctx.Context,
		ctx.String("python"),
		"-m", "script.finetune",
		"--model-type", ctx.String("model-type"),
		"--checkpoint", ctx.String("model-checkpoint"),
		"--output", ctx.String("decoder-path"),
		"--device", device,
		"--sample-dir", ctx.String("sample-dir"),
		"--workspace", ctx.String("workspace"),
		"--lr", fmt.Sprint(ctx.Float64("lr")),
		"--wd", fmt.Sprint(ctx.Float64("wd")),
		"--num-epoch", fmt.Sprint(ctx.Int("num-epoch")),
	)
	if err != nil {
		return errors.WithStack(err)
	}

	return nil
}

func runPrintRequirements(ctx *cli.Context) error {
	data, err := requirementsTxt.ReadFile("requirements.txt")
	if err != nil {
		return errors.WithStack(err)
	}
	fmt.Println(string(data))
	return nil
}

func runEject(ctx *cli.Context) error {
	dir := ctx.String("dir")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return errors.WithStack(err)
	}

	// python scripts
	for _, f := range []string{
		"__init__.py",
		"embed_server.py",
		"finetune.py",
		"quantize.py",
	} {
		if err := ejectScript(f, dir); err != nil {
			return err
		}
	}

	// requirements.txt
	data, err := requirementsTxt.ReadFile("requirements.txt")
	if err != nil {
		return errors.WithStack(err)
	}
	savePath := filepath.Join(dir, "requirements.txt")
	if err := os.WriteFile(savePath, data, 0644); err != nil {
		return errors.WithStack(err)
	}

	return nil
}

func ejectScript(fname string, dir string) error {
	data, err := script.ReadFile("script/" + fname)
	if err != nil {
		return errors.WithStack(err)
	}
	savePath := filepath.Join(dir, fname)
	if err := os.WriteFile(savePath, data, 0644); err != nil {
		return errors.WithStack(err)
	}
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
