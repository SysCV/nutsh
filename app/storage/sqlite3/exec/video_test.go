package exec

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func TestCreateVideoOk(t *testing.T) {
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "video",
		FrameUrls: []string{"0001.mp4", "0002.mp4"},
	}
	v, err := CreateVideo(context.Background(), conn, req)
	require.NoError(t, err)
	require.Equal(t, v.Name, req.Name)
}

func TestCreateVideoDuplicatedName(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateVideoReq{
		Name: "foo",
	}
	_, err := CreateVideo(ctx, conn, req)
	require.NoError(t, err)
	_, err = CreateVideo(ctx, conn, req)
	require.Error(t, err)
}

func TestListVideosOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	pid := 1
	n := 10
	for i := 0; i < n; i++ {
		_, err := CreateVideo(ctx, conn, &nutshapi.CreateVideoReq{
			ProjectId: fmt.Sprintf("%d", pid),
			Name:      fmt.Sprintf("video%d", i),
		})
		require.NoError(t, err)
	}

	vs, err := ListVideos(ctx, conn, pid)
	require.NoError(t, err)
	require.Equal(t, n, len(vs))
}

func TestGetVideoOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "video",
		FrameUrls: []string{"0001.mp4", "0002.mp4"},
	}
	v, err := CreateVideo(context.Background(), conn, req)
	require.NoError(t, err)
	id := requireInteger(t, v.Id)

	v_, err := GetVideo(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, v_.Id, v.Id)
	require.Equal(t, v_.ProjectId, req.ProjectId)
	require.Equal(t, v_.Name, req.Name)
	require.NotNil(t, v_.FrameUrls)
	require.Equal(t, *v_.FrameUrls, req.FrameUrls)
}

func TestUpdateVideoOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	v, err := CreateVideo(ctx, conn, &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "foo",
	})
	require.NoError(t, err)
	id := requireInteger(t, v.Id)

	req := &nutshapi.UpdateVideoReq{
		Name: "foo2",
	}
	w, err := UpdateVideo(ctx, conn, id, req)
	require.NoError(t, err)
	require.Equal(t, req.Name, w.Name)

	w_, err := GetVideo(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, w.Name, w_.Name)
}

func TestDeleteVideoOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	p, err := CreateVideo(ctx, conn, &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "foo",
	})
	require.NoError(t, err)
	id := requireInteger(t, p.Id)

	q, err := DeleteVideo(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, p.Name, q.Name)

	_, err = GetVideo(ctx, conn, id)
	require.True(t, storage.IsErrNotFound(err))
}

func TestPatchVideoAnnotationOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	p, err := CreateVideo(ctx, conn, &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "foo",
	})
	require.NoError(t, err)

	id := requireInteger(t, p.Id)
	_, v0, err := GetVideoAnnotation(ctx, conn, id)
	require.NoError(t, err)

	v1, err := PatchVideoAnnotationJsonMergePatch(ctx, conn, id, `{"entities":"foo"}`, v0)
	require.NoError(t, err)

	v2, err := PatchVideoAnnotationJsonMergePatch(ctx, conn, id, `{"entities":"bar"}`, v1)
	require.NoError(t, err)

	anno, v, err := GetVideoAnnotation(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, v2, v)
	require.NotNil(t, anno)
	require.Equal(t, `{"entities":"bar"}`, *anno)
}

func TestPatchVideoAnnotationVersinMismatch(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	p, err := CreateVideo(ctx, conn, &nutshapi.CreateVideoReq{
		ProjectId: "1",
		Name:      "foo",
	})
	require.NoError(t, err)

	id := requireInteger(t, p.Id)
	_, v0, err := GetVideoAnnotation(ctx, conn, id)
	require.NoError(t, err)

	_, err = PatchVideoAnnotationJsonMergePatch(ctx, conn, id, `{"entities":"foo"}`, v0)
	require.NoError(t, err)

	_, err = PatchVideoAnnotationJsonMergePatch(ctx, conn, id, `{"entities":"bar"}`, "helloworld")
	require.True(t, storage.IsErrNotFound(err))
}
