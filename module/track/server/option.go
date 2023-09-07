package server

type Options struct {
	pythonBin string
	workspace string
	device    string
}

type Option func(*Options)

func WithPython(bin string) Option {
	return func(o *Options) {
		o.pythonBin = bin
	}
}

func WithWorkspace(dir string) Option {
	return func(o *Options) {
		o.workspace = dir
	}
}

func WithDevice(device string) Option {
	return func(o *Options) {
		o.device = device
	}
}
