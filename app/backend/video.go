package backend

import (
	"context"

	"go.uber.org/zap"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func (s *mServer) DeleteVideo(ctx context.Context, request nutshapi.DeleteVideoRequestObject) (nutshapi.DeleteVideoResponseObject, error) {
	rec, err := s.options.storageVideo.Delete(ctx, request.VideoId)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.DeleteVideo200JSONResponse{
		Video: *rec,
	}, nil
}

func (s *mServer) GetVideo(ctx context.Context, request nutshapi.GetVideoRequestObject) (nutshapi.GetVideoResponseObject, error) {
	rec, err := s.options.storageVideo.Get(ctx, request.VideoId)
	if err != nil {
		if storage.IsErrNotFound(err) {
			return &nutshapi.GetVideo404Response{}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.GetVideo200JSONResponse{
		Video: *rec,
	}, nil
}

func (s *mServer) GetVideoAnnotation(ctx context.Context, request nutshapi.GetVideoAnnotationRequestObject) (nutshapi.GetVideoAnnotationResponseObject, error) {
	anno, version, err := s.options.storageVideo.GetAnnotation(ctx, request.VideoId)
	if err != nil {
		if storage.IsErrNotFound(err) {
			return &nutshapi.GetVideoAnnotation404Response{}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.GetVideoAnnotation200JSONResponse{
		AnnotationJson:    anno,
		AnnotationVersion: version,
	}, nil
}

func (s *mServer) UpdateVideo(ctx context.Context, request nutshapi.UpdateVideoRequestObject) (nutshapi.UpdateVideoResponseObject, error) {
	rec, err := s.options.storageVideo.Update(ctx, request.VideoId, request.Body)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			return &nutshapi.UpdateVideo400JSONResponse{
				ErrorCode: bad.Error(),
			}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.UpdateVideo200JSONResponse{
		Video: *rec,
	}, nil
}

func (s *mServer) CreateVideo(ctx context.Context, request nutshapi.CreateVideoRequestObject) (nutshapi.CreateVideoResponseObject, error) {
	rec, err := s.options.storageVideo.Create(ctx, request.Body)
	if err != nil {
		if bad, ok := err.(*storage.Error); ok {
			return &nutshapi.CreateVideo400JSONResponse{
				ErrorCode: bad.Error(),
			}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}
	return &nutshapi.CreateVideo200JSONResponse{
		Video: *rec,
	}, nil
}

func (s *mServer) ListProjectVideos(ctx context.Context, request nutshapi.ListProjectVideosRequestObject) (nutshapi.ListProjectVideosResponseObject, error) {
	recs, err := s.options.storageVideo.List(ctx, request.ProjectId)
	if err != nil {
		zap.L().Error(err.Error())
		return nil, err
	}

	recs_ := make([]nutshapi.Video, 0)
	for _, r := range recs {
		recs_ = append(recs_, *r)
	}
	return &nutshapi.ListProjectVideos200JSONResponse{
		Videos: recs_,
	}, nil
}

func (s *mServer) PatchVideoAnnotation(ctx context.Context, request nutshapi.PatchVideoAnnotationRequestObject) (nutshapi.PatchVideoAnnotationResponseObject, error) {
	patch := storage.JsonMergePatch(request.Body.JsonMergePatch)
	if patch == "" {
		return &nutshapi.PatchVideoAnnotation400JSONResponse{
			ErrorCode: ErrMissingJsonPatch().Error(),
		}, nil
	}
	version := storage.AnnotationVersion(request.Body.AnnotationVersion)

	newVersion, err := s.options.storageVideo.PatchAnnotationJsonMergePatch(ctx, request.VideoId, patch, version)
	if err != nil {
		if storage.IsErrNotFound(err) {
			return &nutshapi.PatchVideoAnnotation409Response{}, nil
		}
		zap.L().Error(err.Error())
		return nil, err
	}

	return &nutshapi.PatchVideoAnnotation200JSONResponse{
		AnnotationVersion: newVersion,
	}, nil
}
