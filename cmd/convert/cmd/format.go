package cmd

type ProjectSpec struct {
}

type VideoResource struct {
	Type      string   `json:"type"`
	Name      string   `json:"name"`
	FrameUrls []string `json:"frameUrls"`
}

type RunLengthEncoding struct {
	CocoCounts string `json:"cocoCounts"`
	Size       []int  `json:"size"`
}

type Mask struct {
	Rle    *RunLengthEncoding `json:"rle"`
	Offset []int              `json:"offset,omitempty"`
}

type ComponentList struct {
	Masks []*Mask `json:"masks"`
}
type Entity struct {
	SliceComponents map[int]*ComponentList `json:"sliceComponents"`
}

type Annotation struct {
	Entities []*Entity `json:"entities"`
}

type ResourceAnnotation struct {
	Resource   *VideoResource `json:"resource"`
	Annotation *Annotation    `json:"annotation"`
}

type Format struct {
	ProjectSpec *ProjectSpec          `json:"projectSpec"`
	Annotations []*ResourceAnnotation `json:"annotations"`
}
