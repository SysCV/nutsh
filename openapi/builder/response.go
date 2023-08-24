package builder

import "github.com/getkin/kin-openapi/openapi3"

func BadRequest() *openapi3.ResponseRef {
	return &openapi3.ResponseRef{
		Value: openapi3.NewResponse().WithDescription("BadRequest").WithJSONSchema(&openapi3.Schema{
			Type:     openapi3.TypeObject,
			Required: []string{"error_code"},
			Properties: openapi3.Schemas{
				"error_code": PrimitiveSchemaRef(openapi3.TypeString),
			},
		}),
	}
}

func NotFound() *openapi3.ResponseRef {
	return &openapi3.ResponseRef{
		Value: openapi3.NewResponse().WithDescription("NotFound"),
	}
}

func OK(schema string) *openapi3.ResponseRef {
	return &openapi3.ResponseRef{
		Value: openapi3.NewResponse().WithDescription("Success").WithJSONSchemaRef(
			SchemaRef(schema),
		),
	}
}

func ACK() *openapi3.ResponseRef {
	return &openapi3.ResponseRef{
		Value: openapi3.NewResponse().WithDescription("Success"),
	}
}
