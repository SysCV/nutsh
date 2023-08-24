package cmd

var SaveOption struct {
	OutputPath string
	S3         struct {
		Region    string
		Bucket    string
		KeyPrefix string
	}
}

var DAVISOption struct {
	VideoDir string
	AnnoDir  string
}

var SAMOption struct {
	Dir string
}
