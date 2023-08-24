package builder

import "github.com/getkin/kin-openapi/openapi3"

func New(base *openapi3.T) *openapi3.T {
	if base.Paths == nil {
		base.Paths = make(openapi3.Paths)
	}

	base.Paths["/metadata"] = &openapi3.PathItem{
		Get: &openapi3.Operation{
			Summary:     "Get application metadata",
			OperationID: "GetMetadata",
			Responses: openapi3.Responses{
				"200": &openapi3.ResponseRef{
					Value: openapi3.NewResponse().WithDescription("Success").WithJSONSchema(&openapi3.Schema{
						Type:     openapi3.TypeObject,
						Required: []string{"commit_identifier", "commit_time", "version"},
						Properties: openapi3.Schemas{
							"commit_identifier": PrimitiveSchemaRef(openapi3.TypeString),
							"commit_time":       PrimitiveSchemaRef(openapi3.TypeString),
							"version":           PrimitiveSchemaRef(openapi3.TypeString),
						},
					}),
				},
			},
		},
	}

	return base
}
