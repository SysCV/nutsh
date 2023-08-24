package server

import (
	"embed"
)

type Options struct {
	encoderType       string
	encoderCheckpoint string
	decoderPath       string
	pythonBin         string
	script            embed.FS
	devices           []string
}

type Option func(*Options)

func WithPython(bin string) Option {
	return func(o *Options) {
		o.pythonBin = bin
	}
}

func WithScript(script embed.FS) Option {
	return func(o *Options) {
		o.script = script
	}
}

func WithModel(encoderType, encoderCheckpoint, decoderPath string) Option {
	return func(o *Options) {
		o.encoderType = encoderType
		o.encoderCheckpoint = encoderCheckpoint
		o.decoderPath = decoderPath
	}
}

func WithDevices(devices []string) Option {
	return func(o *Options) {
		o.devices = devices
	}
}
