package builder

import "github.com/getkin/kin-openapi/openapi3"

const IdType = openapi3.TypeString

type SchemaRefOption func(*openapi3.SchemaRef)

func WithSchemaRefDescription(desc string) SchemaRefOption {
	return func(o *openapi3.SchemaRef) {
		o.Value.Description = desc
	}
}

func PrimitiveSchemaRef(tname string, opts ...SchemaRefOption) *openapi3.SchemaRef {
	ref := &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type: tname,
		},
	}
	for _, opt := range opts {
		opt(ref)
	}
	return ref
}

func ArraySchemaRef(name string) *openapi3.SchemaRef {
	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:  openapi3.TypeArray,
			Items: SchemaRef(name),
		},
	}
}
