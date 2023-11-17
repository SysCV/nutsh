package action

import "io/fs"

var StorageOption struct {
	Workspace string
}

var StartOption struct {
	Frontend fs.FS
	Doc      fs.FS

	Port                   int
	Readonly               bool
	DataDir                string
	OnlineSegmentationAddr string
	TrackAddr              string
}

var ImportOption struct {
	DataPath string
}
