package backend

import (
	"errors"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

type Options struct {
	storageProject storage.Project
	storageVideo   storage.Video
	storageSample  storage.Sample
	storagePublic  storage.Public

	config *nutshapi.Config

	dataDir                      string
	onlineSegmentationServerAddr string
	trackServerAddr              string
}

func (o *Options) Validate() error {
	if o.storageProject == nil {
		return errors.New("missing project storage")
	}
	if o.storageVideo == nil {
		return errors.New("missing video storage")
	}
	if o.onlineSegmentationServerAddr != "" {
		if o.storagePublic == nil {
			return errors.New("missing public storage")
		}
		if o.storageSample == nil {
			return errors.New("missing sample storage")
		}
	}
	return nil
}

type Option func(*Options)

func WithProjectStorage(s storage.Project) Option {
	return func(o *Options) {
		o.storageProject = s
	}
}

func WithVideoStorage(s storage.Video) Option {
	return func(o *Options) {
		o.storageVideo = s
	}
}

func WithPublicStorage(s storage.Public) Option {
	return func(o *Options) {
		o.storagePublic = s
	}
}

func WithSampleStorage(s storage.Sample) Option {
	return func(o *Options) {
		o.storageSample = s
	}
}

func WithConfig(config *nutshapi.Config) Option {
	return func(o *Options) {
		o.config = config
	}
}

func WithOnlineSegmentationServerAddr(addr string) Option {
	return func(o *Options) {
		o.onlineSegmentationServerAddr = addr
	}
}

func WithDataDir(dir string) Option {
	return func(o *Options) {
		o.dataDir = dir
	}
}

func WithTrackServerAddr(addr string) Option {
	return func(o *Options) {
		o.trackServerAddr = addr
	}
}
