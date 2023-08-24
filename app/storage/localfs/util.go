package localfs

import (
	"crypto/md5"
	"encoding/hex"
	"os"
	"path"

	"github.com/pkg/errors"
)

func saveFile(savePath string, data []byte) error {
	saveDir := path.Dir(savePath)
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return errors.WithStack(err)
	}
	if err := os.WriteFile(savePath, data, 0644); err != nil {
		return errors.WithStack(err)
	}
	return nil
}

func md5Hash(data []byte) (string, error) {
	h := md5.New()
	if _, err := h.Write(data); err != nil {
		return "", errors.WithStack(err)
	}
	fname := hex.EncodeToString(h.Sum(nil))
	return fname, nil
}
