package sqlite3

import (
	"context"
	"strconv"

	"nutsh/app/storage"
	"nutsh/app/storage/sqlite3/exec"
	"nutsh/openapi/gen/nutshapi"
)

type mVideoStorage struct {
	connPool *connPool

	patchAnnotationMutex *mPatchVideoAnnotationMutex
}

func (s *mVideoStorage) Create(ctx context.Context, req *nutshapi.CreateVideoReq) (*nutshapi.Video, error) {
	if req.Name == "" {
		return nil, storage.ErrMissingField("name")
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.CreateVideo(ctx, conn, req)
}

func (s *mVideoStorage) List(ctx context.Context, pid storage.ProjectId) ([]*nutshapi.Video, error) {
	pid_, err := strconv.Atoi(pid)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.ListVideos(ctx, conn, pid_)
}

func (s *mVideoStorage) Get(ctx context.Context, id storage.VideoId) (*nutshapi.Video, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.GetVideo(ctx, conn, id_)
}

func (s *mVideoStorage) GetAnnotation(ctx context.Context, id storage.VideoId) (*string, storage.AnnotationVersion, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, "", storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, "", err
	}
	defer s.connPool.Put(conn)

	return exec.GetVideoAnnotation(ctx, conn, id_)
}

func (s *mVideoStorage) Update(ctx context.Context, id storage.VideoId, req *nutshapi.UpdateVideoReq) (*nutshapi.Video, error) {
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

	return exec.UpdateVideo(ctx, conn, id_, req)
}

func (s *mVideoStorage) Delete(ctx context.Context, id storage.VideoId) (*nutshapi.Video, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return nil, storage.ErrInvalidId()
	}

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return nil, err
	}
	defer s.connPool.Put(conn)

	return exec.DeleteVideo(ctx, conn, id_)
}

func (s *mVideoStorage) PatchAnnotationJsonMergePatch(ctx context.Context, id storage.VideoId, patch storage.JsonMergePatch, version storage.AnnotationVersion) (storage.AnnotationVersion, error) {
	id_, err := strconv.Atoi(id)
	if err != nil {
		return "", storage.ErrInvalidId()
	}

	// SQLite3 does not have row-level lock. Therefore, we lock at code-level.
	// Without lock, inconsistency may happen if a new patch arrives before the current patch finishes.
	unlock := s.patchAnnotationMutex.Lock(id_)
	defer unlock()

	conn, err := s.connPool.Get(ctx)
	if err != nil {
		return "", err
	}
	defer s.connPool.Put(conn)

	return exec.PatchVideoAnnotationJsonMergePatch(ctx, conn, id_, patch, version)
}
