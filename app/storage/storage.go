package storage

import (
	"context"

	"nutsh/openapi/gen/nutshapi"
)

type idType = string
type ProjectId = idType
type VideoId = idType

type JsonMergePatch = string
type AnnotationVersion = string

type Project interface {
	Create(context.Context, *nutshapi.CreateProjectReq) (*nutshapi.Project, error)
	List(context.Context) ([]*nutshapi.Project, error)
	Get(context.Context, ProjectId) (*nutshapi.Project, error)
	Update(context.Context, ProjectId, *nutshapi.UpdateProjectReq) (*nutshapi.Project, error)
	Delete(context.Context, ProjectId) (*nutshapi.Project, error)
	Import(context.Context, *nutshapi.ImportProjectReq) (*nutshapi.Project, error)
	Export(context.Context, ProjectId) (*nutshapi.ExportProjectResp, error)
}

type Video interface {
	Create(context.Context, *nutshapi.CreateVideoReq) (*nutshapi.Video, error)
	List(context.Context, ProjectId) ([]*nutshapi.Video, error)
	Get(context.Context, VideoId) (*nutshapi.Video, error)
	Update(context.Context, VideoId, *nutshapi.UpdateVideoReq) (*nutshapi.Video, error)
	Delete(context.Context, VideoId) (*nutshapi.Video, error)

	GetAnnotation(context.Context, VideoId) (*string, AnnotationVersion, error)
	PatchAnnotationJsonMergePatch(context.Context, VideoId, JsonMergePatch, AnnotationVersion) (AnnotationVersion, error)
}

type Sample interface {
	Create(context.Context, ProjectId, *nutshapi.CreateProjectSampleReq) error
}

type Public interface {
	Put(context.Context, string /* key */, []byte) (string /* url */, error)
	PutTemp(context.Context, []byte) (string /* url */, error)
	Check(context.Context, string /* key */) (string /* url */, error)
}
