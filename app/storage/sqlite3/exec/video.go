package exec

import (
	"context"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func CreateVideo(ctx context.Context, conn *sqlite.Conn, req *nutshapi.CreateVideoReq) (*nutshapi.Video, error) {
	if err := sqlitex.ExecuteTransient(conn, `
		INSERT INTO videos
			(project_id, name, frame_urls)
		VALUES
			(:project_id, :name, :frame_urls)
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":project_id": req.ProjectId,
			":name":       req.Name,
			":frame_urls": strings.Join(req.FrameUrls, ","),
		},
	}); err != nil {
		if bad := checkVideoBadRequest(err); bad != nil {
			return nil, bad
		}
		return nil, errors.WithStack(err)
	}

	id := conn.LastInsertRowID()
	return &nutshapi.Video{
		Id:   strconv.FormatInt(id, 10),
		Name: req.Name,
	}, nil
}

func ListVideos(ctx context.Context, conn *sqlite.Conn, projectId int) ([]*nutshapi.Video, error) {
	var ps []*nutshapi.Video
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			id,
			project_id,
			name
		FROM videos
		WHERE project_id = :project_id
		ORDER BY name ASC
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":project_id": projectId,
		},
		ResultFunc: func(stmt *sqlite.Stmt) error {
			ps = append(ps, &nutshapi.Video{
				Id:        strconv.FormatInt(stmt.ColumnInt64(0), 10),
				ProjectId: strconv.FormatInt(stmt.ColumnInt64(1), 10),
				Name:      stmt.ColumnText(2),
			})
			return nil
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	return ps, nil
}

func GetVideo(ctx context.Context, conn *sqlite.Conn, id int) (*nutshapi.Video, error) {
	var p *nutshapi.Video
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			id,
			project_id,
			name,
			frame_urls
		FROM videos
		WHERE id = :id
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id": id,
		},
		ResultFunc: func(stmt *sqlite.Stmt) error {
			frameUrls := strings.Split(stmt.ColumnText(3), ",")
			p = &nutshapi.Video{
				Id:        strconv.FormatInt(stmt.ColumnInt64(0), 10),
				ProjectId: strconv.FormatInt(stmt.ColumnInt64(1), 10),
				Name:      stmt.ColumnText(2),
				FrameUrls: &frameUrls,
			}
			return nil
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	if p == nil {
		return nil, storage.ErrNotFound()
	}

	return p, nil
}
func GetVideoAnnotation(ctx context.Context, conn *sqlite.Conn, id int) (*string, storage.AnnotationVersion, error) {
	var found bool
	var annoJson *string
	var annoVersion string
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			annotation_json,
			annotation_version
		FROM videos
		WHERE id = :id
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id": id,
		},
		ResultFunc: func(stmt *sqlite.Stmt) error {
			found = true
			t := stmt.ColumnText(0)
			if t != "" {
				annoJson = &t
			}
			annoVersion = stmt.ColumnText(1)
			return nil
		},
	}); err != nil {
		return nil, "", errors.WithStack(err)
	}

	if !found {
		return nil, "", storage.ErrNotFound()
	}

	return annoJson, annoVersion, nil
}

func UpdateVideo(ctx context.Context, conn *sqlite.Conn, id int, req *nutshapi.UpdateVideoReq) (*nutshapi.Video, error) {
	if err := sqlitex.ExecuteTransient(conn, `
		UPDATE videos SET
			name=:name
		WHERE id=:id
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id":   id,
			":name": req.Name,
		},
	}); err != nil {
		if bad := checkVideoBadRequest(err); bad != nil {
			return nil, bad
		}
		return nil, errors.WithStack(err)
	}

	return &nutshapi.Video{
		Id:   strconv.Itoa(id),
		Name: req.Name,
	}, nil
}

func DeleteVideo(ctx context.Context, conn *sqlite.Conn, id int) (*nutshapi.Video, error) {
	video, err := GetVideo(ctx, conn, id)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	if err := sqlitex.ExecuteTransient(conn, `DELETE FROM videos WHERE id=:id`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id": id,
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	return video, nil
}

func PatchVideoAnnotationJsonMergePatch(ctx context.Context, conn *sqlite.Conn, id int, patch storage.JsonMergePatch, version storage.AnnotationVersion) (storage.AnnotationVersion, error) {
	newVersion := uuid.NewString()
	if err := sqlitex.ExecuteTransient(conn, `
		UPDATE videos SET
			annotation_json=JSON_PATCH(COALESCE(annotation_json, '{"entities":{}}'), :patch),
			annotation_version=:new_version
		WHERE id=:id AND annotation_version=:old_version
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id":          id,
			":patch":       patch,
			":old_version": version,
			":new_version": newVersion,
		},
	}); err != nil {
		return "", errors.WithStack(err)
	}

	numChange := conn.Changes()
	if numChange == 0 {
		return "", storage.ErrNotFound()
	}

	return storage.AnnotationVersion(newVersion), nil
}

func checkVideoBadRequest(err error) error {
	if strings.Contains(err.Error(), "UNIQUE constraint failed: videos.project_id, videos.name") {
		return storage.ErrUniqueFieldConflict("videos.name")
	}
	return nil
}
