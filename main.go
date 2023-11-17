package main

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"

	"github.com/labstack/echo/v4"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"

	"nutsh/app/action"
	"nutsh/app/buildtime"
)

//go:embed app/frontend/build/*
var frontend embed.FS

//go:embed docs/build/*
var docs embed.FS

func main() {
	mustSetupLogger()

	homeDir, err := os.UserHomeDir()
	mustOk(err)
	defaultWorkspace := filepath.Join(homeDir, ".nutsh", "workspace")

	workspaceFlag := &cli.StringFlag{
		Name:        "workspace",
		Usage:       "workspace folder of the application",
		Value:       defaultWorkspace,
		EnvVars:     []string{"NUTSH_WORKSPACE"},
		Destination: &action.StorageOption.Workspace,
	}

	app := &cli.App{
		Name:   "nutsh",
		Usage:  "Start the nutsh application",
		Action: runStart,
		Flags: []cli.Flag{
			workspaceFlag,
			&cli.IntFlag{
				Name:        "port",
				Aliases:     []string{"p"},
				Usage:       "port to listen",
				Value:       12346,
				EnvVars:     []string{"NUTSH_PORT"},
				Destination: &action.StartOption.Port,
			},
			&cli.BoolFlag{
				Name:        "readonly",
				Usage:       "toggle readonly mode",
				Value:       false,
				EnvVars:     []string{"NUTSH_READONLY"},
				Destination: &action.StartOption.Readonly,
			},
			&cli.StringFlag{
				Name:        "online-segmentation",
				Usage:       "address to a online segmenation server",
				EnvVars:     []string{"NUTSH_ONLINE_SEGMENTATION"},
				Destination: &action.StartOption.OnlineSegmentationAddr,
			},
			&cli.StringFlag{
				Name:        "track",
				Usage:       "address to a track server",
				EnvVars:     []string{"NUTSH_TRACK"},
				Destination: &action.StartOption.TrackAddr,
			},
			&cli.StringFlag{
				Name:        "data-dir",
				Usage:       "data directory to serve local files",
				EnvVars:     []string{"NUTSH_DATA_DIR"},
				Destination: &action.StartOption.DataDir,
			},
		},
		Commands: []*cli.Command{
			{
				Name:   "version",
				Usage:  "Show version",
				Action: runShowVersion,
			},
			{
				Name:   "import",
				Usage:  "Import project",
				Action: runImport,
				Flags: []cli.Flag{
					workspaceFlag,
					&cli.StringFlag{
						Name:        "data",
						Aliases:     []string{"d"},
						Usage:       "path to the data file",
						Required:    true,
						Destination: &action.ImportOption.DataPath,
					},
				},
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runStart(ctx *cli.Context) error {
	action.StartOption.Frontend = echo.MustSubFS(frontend, "app/frontend/build")
	action.StartOption.Doc = echo.MustSubFS(docs, "docs/build")
	return action.Start(ctx.Context)
}

func runShowVersion(ctx *cli.Context) error {
	fmt.Printf("%s %s %s\n", buildtime.Version, buildtime.CommitIdentifier, buildtime.CommitTime)
	return nil
}

func runImport(ctx *cli.Context) error {
	return action.Import(ctx.Context)
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
