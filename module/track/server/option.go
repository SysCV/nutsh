package server

type Options struct {
	pythonBin string
}

type Option func(*Options)

func WithPython(bin string) Option {
	return func(o *Options) {
		o.pythonBin = bin
	}
}
