package sqlite3

import (
	"context"
	"strconv"

	"zombiezen.com/go/sqlite/sqlitex"

	"nutsh/app/storage"
	"nutsh/app/storage/sqlite3/exec"
	"nutsh/openapi/gen/nutshapi"
)

type mProjectStorage struct {
	connPool *connPool
}

func (s *mProjectStorage) Close() error {
	return s.connPool.Close()
}

func (s *mProjectStorage) Create(ctx context.Context, req *nutshapi.CreateProjectReq) (*nutshapi.Project, error) {
	if req.Name == "" {
		return nil, storage.ErrMissingField("name")
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.CreateProject(ctx, conn, req)
}

func (s *mProjectStorage) List(ctx context.Context) ([]*nutshapi.Project, error) {
	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.ListProject(ctx, conn)
}

func (s *mProjectStorage) Get(ctx context.Context, id storage.ProjectId) (*nutshapi.Project, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.GetProject(ctx, conn, id_)
}

func (s *mProjectStorage) Update(ctx context.Context, id storage.ProjectId, req *nutshapi.UpdateProjectReq) (*nutshapi.Project, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	if req.Name == "" {
		return nil, storage.ErrMissingField("name")
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.UpdateProject(ctx, conn, id_, req)
}

func (s *mProjectStorage) Delete(ctx context.Context, id storage.ProjectId) (*nutshapi.Project, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.DeleteProject(ctx, conn, id_)
}

func (s *mProjectStorage) Import(ctx context.Context, req *nutshapi.ImportProjectReq) (*nutshapi.Project, error) {
	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	done := sqlitex.Transaction(conn)
	res, err := exec.ImportProject(ctx, conn, req)
	defer done(&err)

	return res, err
}

func (s *mProjectStorage) Export(ctx context.Context, id storage.ProjectId) (*nutshapi.ExportProjectResp, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.ExportProject(ctx, conn, id_)
}
