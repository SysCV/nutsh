package main

import (
	"fmt"
	"os"
	"time"

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"

	sam "sam/action"
)

func main() {
	mustSetupLogger()

	app := &cli.App{
		Name: "CLI tool to deal with Meta AI's SAM",
		Commands: []*cli.Command{
			{
				Name:        "hit",
				Description: "Hit the SAM module for developing and testing",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "address",
						Aliases:  []string{"a"},
						Required: true,
						Usage:    "address to the SAM server",
					},
					&cli.IntFlag{
						Name:     "count",
						Aliases:  []string{"c"},
						Required: true,
						Usage:    "number of requests to send",
					},
					&cli.StringFlag{
						Name:    "image",
						Aliases: []string{"i"},
						Value:   "https://segment-anything.com/assets/gallery/farmhouse_in_provence_1970.17.34.jpg",
						Usage:   "the url of the image used to test",
					},
					&cli.DurationFlag{
						Name:  "timeout",
						Value: 15 * time.Second,
						Usage: "embed timeout",
					},
				},
				Action: sam.Hit,
			},
		},
	}

	mustOk(app.Run(os.Args))
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
