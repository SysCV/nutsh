package server

import (
	"crypto/md5"
	"encoding/hex"
	"io"
	"net"
	"os"

	"github.com/pkg/errors"
)

func saveFile(file *os.File, data []byte) error {
	defer file.Close()
	if _, err := file.Write(data); err != nil {
		return errors.WithStack(err)
	}
	return nil
}

func fileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", errors.WithStack(err)
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", errors.WithStack(err)
	}
	str := hex.EncodeToString(hash.Sum(nil))
	return str, nil
}

func freePort() (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	if err != nil {
		return 0, errors.WithStack(err)
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, errors.WithStack(err)
	}
	defer l.Close()

	return l.Addr().(*net.TCPAddr).Port, nil
}
