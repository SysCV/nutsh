package action

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/fatih/color"
	"github.com/pkg/errors"

	"nutsh/app/storage"
	"nutsh/app/storage/sqlite3"
	"nutsh/openapi/gen/nutshapi"
)

func Import(ctx context.Context) error {
	// storage
	db, err := sqlite3.New(filepath.Join(databaseDir(), "db.sqlite3"))
	if err != nil {
		return err
	}
	store := db.ProjectStorage()

	req, err := loadGzipImportProjectReq(ImportOption.DataPath)
	if err != nil {
		return err
	}

	rec, err := store.Import(ctx, req)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			color.Red(bad.Error())
			return nil
		}
		return err
	}
	color.Green("successfully imported project %s", rec.Name)
	return nil
}

func loadGzipImportProjectReq(fpath string) (*nutshapi.ImportProjectReq, error) {
	f, err := os.Open(fpath)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer f.Close()

	r, err := gzip.NewReader(f)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer r.Close()

	var req nutshapi.ImportProjectReq
	if err := json.NewDecoder(r).Decode(&req); err != nil {
		return nil, errors.WithStack(err)
	}

	return &req, nil
}
