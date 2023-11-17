package common

import (
	"fmt"
	"strconv"
)

func FormatDevice(device string) string {
	if _, err := strconv.Atoi(device); err == nil {
		// treat integral device as GPU index
		device = fmt.Sprintf("cuda:%s", device)
	}
	return device
}
