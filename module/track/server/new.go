package server

import (
	servicev1 "nutsh/proto/gen/service/v1"
)

func New(opts ...Option) (servicev1.TrackServiceServer, func()) {
	o := &Options{
		pythonBin: "python",
	}
	for _, opt := range opts {
		opt(o)
	}

	s := &mServer{
		options: o,
	}

	return s, s.Clean
}

type mServer struct {
	options *Options
}

func (s *mServer) Clean() {
}
