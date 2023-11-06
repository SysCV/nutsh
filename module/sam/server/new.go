package server

import (
	"fmt"
	servicev1 "nutsh/proto/gen/go/service/v1"

	"go.uber.org/zap"
)

func New(opts ...Option) (servicev1.OnlineSegmentationServiceServer, func()) {
	o := &Options{
		pythonBin: "python",
		devices:   []string{"cpu"},
	}
	for _, opt := range opts {
		opt(o)
	}

	// read the decoder and use its md5 as its uuid
	decoderHash, err := fileHash(o.decoderPath)
	if err != nil {
		zap.L().Fatal(err.Error())
	}
	decoderUuid := fmt.Sprintf("sam.%s.%s", o.encoderType, decoderHash)
	zap.L().Info("loaded decoder", zap.String("path", o.decoderPath), zap.String("uuid", decoderUuid))

	s := &mServer{
		options:         o,
		decoderUuid:     decoderUuid,
		embedReqQueue:   make(chan *mEmbedRequest),
		embedServerPool: make(chan chan *mEmbedRequest, len(o.devices)),
	}

	for _, device := range o.devices {
		go s.mustStartEmbedServer(device)
	}
	go s.listenEmbedRequest()

	return s, s.Clean
}

type mServer struct {
	options *Options

	decoderUuid     string
	embedReqQueue   chan *mEmbedRequest
	embedServerPool chan chan *mEmbedRequest
}

func (s *mServer) Clean() {
}
