package action

import "io/fs"

var StorageOption struct {
	Workspace string
}

var StartOption struct {
	Frontend fs.FS
	Doc      fs.FS

	Port               int
	Readonly           bool
	OnlineSegmentation string
	DataDir            string
}

var ImportOption struct {
	DataPath string
}
