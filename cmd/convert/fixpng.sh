#!/bin/bash

# Check if the folder was passed as an argument
if [ -z "$1" ]
then
  echo "Please provide a directory to scan."
  exit 1
fi

# Assign the argument to a variable for clarity
dir=$1

for file in $(find $dir -name "*.png")
do
  # http://www.libpng.org/pub/png/apps/pngcheck.html
  pngcheck -q "$file"
  if [ $? -ne 0 ]; then
    echo "Fixing $file"

    # https://imagemagick.org/script/convert.php
    convert "$file" -depth 8 "${file%.*}_fixed.png"

    pngcheck -q "${file%.*}_fixed.png"
    if [ $? -ne 0 ]; then
      echo "Conversion failed for $file"
    fi
  fi
done
