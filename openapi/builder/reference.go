package builder

import (
	"github.com/getkin/kin-openapi/openapi3"
)

func SchemaRef(name string) *openapi3.SchemaRef {
	return &openapi3.SchemaRef{
		Ref: "#/components/schemas/" + name,
	}
}

func ParameterRef(name string) *openapi3.ParameterRef {
	return &openapi3.ParameterRef{
		Ref: "#/components/parameters/" + name,
	}
}
