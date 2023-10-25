package server

type Options struct {
	pythonBin  string
	scriptMain string
	workspace  string
	gpuIds     *mGpuPool
}

type Option func(*Options)

func WithPythonBin(bin string) Option {
	return func(o *Options) {
		o.pythonBin = bin
	}
}

func WithScriptMain(main string) Option {
	return func(o *Options) {
		o.scriptMain = main
	}
}

func WithWorkspace(dir string) Option {
	return func(o *Options) {
		o.workspace = dir
	}
}

func WithGpuIds(ids []int) Option {
	return func(o *Options) {
		o.gpuIds = &mGpuPool{ids: ids}
	}
}
