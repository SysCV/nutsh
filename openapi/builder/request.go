package builder

import "github.com/getkin/kin-openapi/openapi3"

func Request(schema string) *openapi3.RequestBodyRef {
	return &openapi3.RequestBodyRef{
		Value: openapi3.NewRequestBody().WithJSONSchemaRef(
			SchemaRef(schema),
		),
	}
}
