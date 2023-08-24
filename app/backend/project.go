package backend

import (
	"context"

	"go.uber.org/zap"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func (s *mServer) DeleteProject(ctx context.Context, request nutshapi.DeleteProjectRequestObject) (nutshapi.DeleteProjectResponseObject, error) {
	rec, err := s.options.storageProject.Delete(ctx, request.ProjectId)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.DeleteProject200JSONResponse{
		Project: *rec,
	}, nil
}

func (s *mServer) GetProject(ctx context.Context, request nutshapi.GetProjectRequestObject) (nutshapi.GetProjectResponseObject, error) {
	rec, err := s.options.storageProject.Get(ctx, request.ProjectId)
	if err != nil {
		if storage.IsErrNotFound(err) {
			return &nutshapi.GetProject404Response{}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.GetProject200JSONResponse{
		Project: *rec,
	}, nil
}

func (s *mServer) UpdateProject(ctx context.Context, request nutshapi.UpdateProjectRequestObject) (nutshapi.UpdateProjectResponseObject, error) {
	rec, err := s.options.storageProject.Update(ctx, request.ProjectId, request.Body)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			return &nutshapi.UpdateProject400JSONResponse{
				ErrorCode: bad.Error(),
			}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.UpdateProject200JSONResponse{
		Project: *rec,
	}, nil
}

func (s *mServer) CreateProject(ctx context.Context, request nutshapi.CreateProjectRequestObject) (nutshapi.CreateProjectResponseObject, error) {
	rec, err := s.options.storageProject.Create(ctx, request.Body)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			return &nutshapi.CreateProject400JSONResponse{
				ErrorCode: bad.Error(),
			}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.CreateProject200JSONResponse{
		Project: *rec,
	}, nil
}

func (s *mServer) ListProjects(ctx context.Context, request nutshapi.ListProjectsRequestObject) (nutshapi.ListProjectsResponseObject, error) {
	recs, err := s.options.storageProject.List(ctx)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}

	recs_ := make([]nutshapi.Project, 0)
	for _, r := range recs {
		recs_ = append(recs_, *r)
	}
	return &nutshapi.ListProjects200JSONResponse{
		Projects: recs_,
	}, nil
}

func (s *mServer) ImportProject(ctx context.Context, request nutshapi.ImportProjectRequestObject) (nutshapi.ImportProjectResponseObject, error) {
	rec, err := s.options.storageProject.Import(ctx, request.Body)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			return &nutshapi.ImportProject400JSONResponse{
				ErrorCode: bad.Error(),
			}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.ImportProject200JSONResponse{
		Project: *rec,
	}, nil
}

func (s *mServer) ExportProject(ctx context.Context, request nutshapi.ExportProjectRequestObject) (nutshapi.ExportProjectResponseObject, error) {
	out, err := s.options.storageProject.Export(ctx, request.ProjectId)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}

	return nutshapi.ExportProject200JSONResponse(*out), nil
}
