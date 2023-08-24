package sqlite3

import (
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	"go.uber.org/zap"
	"zombiezen.com/go/sqlite"

	"nutsh/app/storage"
	"nutsh/app/storage/sqlite3/exec"
)

type Database struct {
	connPool *connPool
}

func New(path string) (*Database, error) {
	if err := initializeDatabaseIfNecessary(path); err != nil {
		return nil, err
	}

	db := &Database{
		connPool: &connPool{path: path},
	}

	return db, nil
}

func (d *Database) Close() error {
	return d.connPool.Close()
}

func (d *Database) ProjectStorage() storage.Project {
	return &mProjectStorage{
		connPool: d.connPool,
	}
}

func (d *Database) VideoStorage() storage.Video {
	return &mVideoStorage{
		connPool:             d.connPool,
		patchAnnotationMutex: &mPatchVideoAnnotationMutex{},
	}
}

func initializeDatabaseIfNecessary(path string) error {
	// initialzie a database if file at path does not exist
	if _, err := os.Stat(path); err == nil {
		// db file exists
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		// unexpected error
		return errors.WithStack(err)
	}

	// create intermediate folders
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, os.ModePerm); err != nil {
		return errors.WithStack(err)
	}

	// initialize the new db file
	conn, err := sqlite.OpenConn(path, 0)
	if err != nil {
		return errors.WithStack(err)
	}
	defer conn.Close()

	if err := exec.InitializeSchema(conn); err != nil {
		return errors.WithStack(err)
	}

	zap.L().Info("Initialized database", zap.String("path", path))

	return nil
}
