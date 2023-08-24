package main

import (
	"flag"
	"fmt"
	"os"

	"nutsh/openapi"
)

func main() {
	output := flag.String("output", "", "output path")
	flag.Parse()

	if *output == "" {
		fmt.Fprintf(os.Stderr, "must specify --output")
		return
	}

	nutshapi := openapi.NewNutsh()

	data, err := nutshapi.MarshalJSON()
	must(err)

	must(os.WriteFile(*output, data, 0644))
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
