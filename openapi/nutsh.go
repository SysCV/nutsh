package openapi

import (
	"nutsh/openapi/builder"

	"github.com/getkin/kin-openapi/openapi3"
)

func NewNutsh() *openapi3.T {
	return builder.New(&openapi3.T{
		OpenAPI: "3.0.0",
		Info: &openapi3.Info{
			Title:       "Nutsh API",
			Description: "REST APIs used for interacting with the Nutsh Service",
			Version:     "0.0.1",
		},
		Servers: openapi3.Servers{
			&openapi3.Server{
				URL: "/api",
			},
		},
		Paths: openapi3.Paths{
			// Config
			"/config": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetConfig",
					Responses: openapi3.Responses{
						"200": builder.OK("GetConfigResp"),
					},
				},
			},

			// Project

			"/projects": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "ListProjects",
					Responses: openapi3.Responses{
						"200": builder.OK("ListProjectsResp"),
					},
				},
				Post: &openapi3.Operation{
					OperationID: "CreateProject",
					RequestBody: builder.Request("CreateProjectReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("CreateProjectResp"),
						"400": builder.BadRequest(),
					},
				},
			},
			"/project/{projectId}": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetProject",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("GetProjectResp"),
						"404": builder.NotFound(),
					},
				},
				Post: &openapi3.Operation{
					OperationID: "UpdateProject",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					RequestBody: builder.Request("UpdateProjectReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("UpdateProjectResp"),
						"400": builder.BadRequest(),
					},
				},
				Delete: &openapi3.Operation{
					OperationID: "DeleteProject",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("DeleteProjectResp"),
					},
				},
			},
			"/projects/_import": &openapi3.PathItem{
				Post: &openapi3.Operation{
					OperationID: "ImportProject",
					RequestBody: builder.Request("ImportProjectReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("ImportProjectResp"),
						"400": builder.BadRequest(),
					},
				},
			},
			"/project/{projectId}/_export": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "ExportProject",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("ExportProjectResp"),
					},
				},
			},
			"/project/{projectId}/videos": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "ListProjectVideos",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("ListProjectVideosResp"),
					},
				},
			},
			"/project/{projectId}/samples": &openapi3.PathItem{
				Post: &openapi3.Operation{
					OperationID: "CreateProjectSample",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("projectId"),
					},
					RequestBody: builder.Request("CreateProjectSampleReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("CreateProjectSampleResp"),
					},
				},
			},

			// Video

			"/videos": &openapi3.PathItem{
				Post: &openapi3.Operation{
					OperationID: "CreateVideo",
					RequestBody: builder.Request("CreateVideoReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("CreateVideoResp"),
						"400": builder.BadRequest(),
					},
				},
			},
			"/video/{videoId}": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetVideo",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("videoId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("GetVideoResp"),
						"404": builder.NotFound(),
					},
				},
				Post: &openapi3.Operation{
					OperationID: "UpdateVideo",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("videoId"),
					},
					RequestBody: builder.Request("UpdateVideoReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("UpdateVideoResp"),
						"400": builder.BadRequest(),
					},
				},
				Delete: &openapi3.Operation{
					OperationID: "DeleteVideo",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("videoId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("DeleteVideoResp"),
					},
				},
			},
			"/video/{videoId}/annotation": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetVideoAnnotation",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("videoId"),
					},
					Responses: openapi3.Responses{
						"200": builder.OK("GetVideoAnnotationResp"),
						"404": builder.NotFound(),
					},
				},
				Patch: &openapi3.Operation{
					OperationID: "PatchVideoAnnotation",
					Parameters: openapi3.Parameters{
						builder.ParameterRef("videoId"),
					},
					RequestBody: builder.Request("PatchVideoAnnotationReq"),
					Responses: openapi3.Responses{
						"200": builder.OK("PatchVideoAnnotationResp"),
						"400": builder.BadRequest(),
						"409": &openapi3.ResponseRef{
							Value: openapi3.NewResponse().WithDescription("Conflict"),
						},
					},
				},
			},

			// Online segmentation
			// TODO(hxu): in the future multiple online segmentation services should be supported.
			"/online_segmentation": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetOnlineSegmentation",
					Responses: openapi3.Responses{
						"200": builder.OK("GetOnlineSegmentationResp"),
					},
				},
			},
			"/online_segmentation/_embed": &openapi3.PathItem{
				Get: &openapi3.Operation{
					OperationID: "GetOnlineSegmentationEmbedding",
					Parameters: openapi3.Parameters{
						&openapi3.ParameterRef{
							Value: &openapi3.Parameter{
								Name:     "image_url",
								In:       openapi3.ParameterInQuery,
								Schema:   builder.PrimitiveSchemaRef(openapi3.TypeString),
								Required: true,
							},
						},
						&openapi3.ParameterRef{
							Value: &openapi3.Parameter{
								Name:     "decoder_uuid",
								In:       openapi3.ParameterInQuery,
								Schema:   builder.PrimitiveSchemaRef(openapi3.TypeString),
								Required: true,
							},
						},
						&openapi3.ParameterRef{
							Value: &openapi3.Parameter{
								Name:   "crop",
								In:     openapi3.ParameterInQuery,
								Style:  "deepObject",
								Schema: builder.SchemaRef("GridRect"),
							},
						},
					},
					Responses: openapi3.Responses{
						"200": builder.OK("GetOnlineSegmentationEmbeddingResp"),
						"400": builder.BadRequest(),
						"429": &openapi3.ResponseRef{Value: openapi3.NewResponse()},
					},
				},
			},
		},
		Components: openapi3.Components{
			Parameters: openapi3.ParametersMap{
				"projectId": &openapi3.ParameterRef{
					Value: &openapi3.Parameter{
						Name:     "projectId",
						In:       openapi3.ParameterInPath,
						Required: true,
						Schema:   builder.PrimitiveSchemaRef(builder.IdType),
					},
				},
				"videoId": &openapi3.ParameterRef{
					Value: &openapi3.Parameter{
						Name:     "videoId",
						In:       openapi3.ParameterInPath,
						Required: true,
						Schema:   builder.PrimitiveSchemaRef(builder.IdType),
					},
				},
			},
			Schemas: openapi3.Schemas{
				// Config

				"Config": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"readonly", "online_segmentation_enabled"},
						Properties: openapi3.Schemas{
							"readonly":                    builder.PrimitiveSchemaRef(openapi3.TypeBoolean),
							"online_segmentation_enabled": builder.PrimitiveSchemaRef(openapi3.TypeBoolean),
						},
					},
				},

				"GetConfigResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"config"},
						Properties: openapi3.Schemas{
							"config": builder.SchemaRef("Config"),
						},
					},
				},

				// Project

				"Project": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"id", "name", "remark"},
						Properties: openapi3.Schemas{
							"id":        builder.PrimitiveSchemaRef(builder.IdType),
							"name":      builder.PrimitiveSchemaRef(openapi3.TypeString),
							"remark":    builder.PrimitiveSchemaRef(openapi3.TypeString),
							"spec_json": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"ListProjectsResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"projects"},
						Properties: openapi3.Schemas{
							"projects": builder.ArraySchemaRef("Project"),
						},
					},
				},

				"CreateProjectReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"name", "spec_json", "remark"},
						Properties: openapi3.Schemas{
							"name":      builder.PrimitiveSchemaRef(openapi3.TypeString),
							"remark":    builder.PrimitiveSchemaRef(openapi3.TypeString),
							"spec_json": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"CreateProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
						},
					},
				},

				"GetProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
						},
					},
				},

				"UpdateProjectReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"name", "remark"},
						Properties: openapi3.Schemas{
							"name":   builder.PrimitiveSchemaRef(openapi3.TypeString),
							"remark": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"UpdateProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
						},
					},
				},

				"DeleteProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
						},
					},
				},

				"ImportProjectReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("CreateProjectReq"),
							"videos": &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type: openapi3.TypeArray,
									Items: &openapi3.SchemaRef{
										Value: &openapi3.Schema{
											Type:     openapi3.TypeObject,
											Required: []string{"name", "frame_urls"},
											Properties: openapi3.Schemas{
												"name": builder.PrimitiveSchemaRef(openapi3.TypeString),
												"frame_urls": &openapi3.SchemaRef{
													Value: &openapi3.Schema{
														Type:  openapi3.TypeArray,
														Items: builder.PrimitiveSchemaRef(openapi3.TypeString),
													},
												},
											},
										},
									},
								},
							},
							"annotations": &openapi3.SchemaRef{Value: &openapi3.Schema{
								Type: openapi3.TypeObject,
								AdditionalProperties: builder.PrimitiveSchemaRef(
									openapi3.TypeString,
									builder.WithSchemaRefDescription("Serialized annotation Json."),
								),
								Description: "Key is the video name",
							}},
						},
					},
				},

				"ImportProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
						},
					},
				},

				"ExportProjectResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project", "videos", "annotations"},
						Properties: openapi3.Schemas{
							"project": builder.SchemaRef("Project"),
							"videos": &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type:  openapi3.TypeArray,
									Items: builder.SchemaRef("ExportProjectRespVideo"),
								},
							},
							"annotations": &openapi3.SchemaRef{Value: &openapi3.Schema{
								Type: openapi3.TypeObject,
								AdditionalProperties: builder.PrimitiveSchemaRef(
									openapi3.TypeString,
									builder.WithSchemaRefDescription("Serialized annotation Json."),
								),
								Description: "Key is the video name",
							}},
						},
					},
				},

				"ExportProjectRespVideo": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"id", "name", "frame_urls"},
						Properties: openapi3.Schemas{
							"id":   builder.PrimitiveSchemaRef(builder.IdType),
							"name": builder.PrimitiveSchemaRef(openapi3.TypeString),
							"frame_urls": &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type:  openapi3.TypeArray,
									Items: builder.PrimitiveSchemaRef(openapi3.TypeString),
								},
							},
						},
					},
				},

				"ListProjectVideosResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"videos"},
						Properties: openapi3.Schemas{
							"videos": builder.ArraySchemaRef("Video"),
						},
					},
				},

				"CreateProjectSampleReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"sample_json"},
						Properties: openapi3.Schemas{
							"sample_json": builder.PrimitiveSchemaRef(openapi3.TypeString, builder.WithSchemaRefDescription("serialized schema.v1.Sample proto")),
						},
					},
				},

				"CreateProjectSampleResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: openapi3.TypeObject,
					},
				},

				// Video

				"Video": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"id", "project_id", "name"},
						Properties: openapi3.Schemas{
							"id":         builder.PrimitiveSchemaRef(builder.IdType),
							"project_id": builder.PrimitiveSchemaRef(builder.IdType),
							"name":       builder.PrimitiveSchemaRef(openapi3.TypeString),
							"frame_urls": &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type:  openapi3.TypeArray,
									Items: builder.PrimitiveSchemaRef(openapi3.TypeString),
								},
							},
						},
					},
				},

				"GetVideoResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"video"},
						Properties: openapi3.Schemas{
							"video": builder.SchemaRef("Video"),
						},
					},
				},

				"CreateVideoReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"project_id", "name", "frame_urls"},
						Properties: openapi3.Schemas{
							"project_id": builder.PrimitiveSchemaRef(builder.IdType),
							"name":       builder.PrimitiveSchemaRef(openapi3.TypeString),
							"frame_urls": &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type:  openapi3.TypeArray,
									Items: builder.PrimitiveSchemaRef(openapi3.TypeString),
								},
							},
						},
					},
				},

				"CreateVideoResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"video"},
						Properties: openapi3.Schemas{
							"video": builder.SchemaRef("Video"),
						},
					},
				},

				"UpdateVideoReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"name"},
						Properties: openapi3.Schemas{
							"name": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"UpdateVideoResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"video"},
						Properties: openapi3.Schemas{
							"video": builder.SchemaRef("Video"),
						},
					},
				},

				"DeleteVideoResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"video"},
						Properties: openapi3.Schemas{
							"video": builder.SchemaRef("Video"),
						},
					},
				},

				"GetVideoAnnotationResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"annotation_version"},
						Properties: openapi3.Schemas{
							"annotation_json": builder.PrimitiveSchemaRef(
								openapi3.TypeString,
								builder.WithSchemaRefDescription("A serialized Json string."),
							),
							"annotation_version": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"PatchVideoAnnotationReq": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"json_merge_patch", "annotation_version"},
						Properties: openapi3.Schemas{
							// Prefer to use JSON Merge Patch (RFC 7396) which is much faster since SQLite3 natively support it.
							/*
								"json_patch": builder.PrimitiveSchemaRef(
									openapi3.TypeString,
									builder.WithSchemaRefDescription("JSON Patch (RFC 6902) applied to the annotation Json."),
								),
							*/
							"json_merge_patch": builder.PrimitiveSchemaRef(
								openapi3.TypeString,
								builder.WithSchemaRefDescription("JSON Merge Patch (RFC 7396) applied to the annotation Json."),
							),
							"annotation_version": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"PatchVideoAnnotationResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"annotation_version"},
						Properties: openapi3.Schemas{
							"annotation_version": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				// Online segmentation

				"OnlineSegmentationDecoder": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"uuid", "url", "feed_js"},
						Properties: openapi3.Schemas{
							"uuid":    builder.PrimitiveSchemaRef(openapi3.TypeString),
							"url":     builder.PrimitiveSchemaRef(openapi3.TypeString),
							"feed_js": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				"GetOnlineSegmentationResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: openapi3.TypeObject,
						Properties: openapi3.Schemas{
							// online segmentation is disabled when this field is missing
							"decoder": builder.SchemaRef("OnlineSegmentationDecoder"),
						},
					},
				},

				"GetOnlineSegmentationEmbeddingResp": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"embedding_url"},
						Properties: openapi3.Schemas{
							"embedding_url": builder.PrimitiveSchemaRef(openapi3.TypeString),
						},
					},
				},

				// Misc

				"GridRect": &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"x", "y", "width", "height"},
						Properties: openapi3.Schemas{
							"x":      builder.PrimitiveSchemaRef(openapi3.TypeInteger),
							"y":      builder.PrimitiveSchemaRef(openapi3.TypeInteger),
							"width":  builder.PrimitiveSchemaRef(openapi3.TypeInteger),
							"height": builder.PrimitiveSchemaRef(openapi3.TypeInteger),
						},
					},
				},
			},
		},
	})
}
