package main

import (
	"fmt"
	"os"

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"

	"convert/cmd"
)

var saveFlags = []cli.Flag{
	&cli.StringFlag{
		Name:        "s3-region",
		Usage:       "region of the s3 storage",
		Destination: &cmd.SaveOption.S3.Region,
	},
	&cli.StringFlag{
		Name:        "s3-bucket",
		Required:    true,
		Usage:       "name of the s3 bucket to store images",
		Destination: &cmd.SaveOption.S3.Bucket,
	},
	&cli.StringFlag{
		Name:        "s3-key-prefix",
		Required:    true,
		Usage:       "prefix of the s3 key to save images",
		Destination: &cmd.SaveOption.S3.KeyPrefix,
	},
	&cli.StringFlag{
		Name:        "output",
		Aliases:     []string{"o"},
		Required:    true,
		Usage:       "path to save the generated project serialization",
		Destination: &cmd.SaveOption.OutputPath,
	},
}

func main() {
	mustSetupLogger()

	app := &cli.App{
		Name: "CLI tool to convert external dataset to nutsh format",
		Commands: []*cli.Command{
			{
				Name:   "davis",
				Usage:  "convert dataset in DAVIS video segmentation format",
				Action: runDAVIS,
				Flags: append(saveFlags,
					&cli.StringFlag{
						Name:        "video-dir",
						Usage:       "folder of video",
						Required:    true,
						Destination: &cmd.DAVISOption.VideoDir,
					},
					&cli.StringFlag{
						Name:        "anno-dir",
						Usage:       "folder of annotations",
						Required:    true,
						Destination: &cmd.DAVISOption.AnnoDir,
					},
				),
			},
			{
				Name:   "sam",
				Usage:  "convert dataset in SAM image segmentation format",
				Action: runSAM,
				Flags: append(saveFlags,
					&cli.StringFlag{
						Name:        "dir",
						Usage:       "dataset folder",
						Required:    true,
						Destination: &cmd.SAMOption.Dir,
					},
				),
			},
		},
	}

	mustOk(app.Run(os.Args))
}

func runDAVIS(ctx *cli.Context) error {
	return cmd.DAVIS(ctx.Context)
}

func runSAM(ctx *cli.Context) error {
	return cmd.SAM(ctx.Context)
}

func mustSetupLogger() *zap.Logger {
	config := zap.NewProductionConfig()
	logger, err := config.Build()
	mustOk(err)

	zap.ReplaceGlobals(logger)
	return logger
}

func mustOk(err error) {
	if err == nil {
		return
	}
	fmt.Printf("%+v", err)
	os.Exit(1)
}
