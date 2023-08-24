This CLI tool convert some existing datasets to nutsh format.

# Prerequisite

AWS S3 is used to store images. Therefore, before using this tool, configure the AWS credentials through `aws configure` through [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

# SAM

The Segment-Anything-Model dataset can be accessed [here](https://ai.meta.com/datasets/segment-anything/).

Run following command to convert:

```
go run main.go sam \
    --s3-region <your S3 region> \
    --s3-bucket <your S3 bucket> \
    --s3-key-prefix <your S3 folder> \
    -o <path to save the nutsh format JSON> \
    --dir <path to SAM dataset folder>
```

For example, a SAM data batch after decompressing looks like

```
- /path/to/SAM
    - sa_223750.jpg
    - sa_223750.json
    - sa_223751.jpg
    - sa_223751.json
    ...
```

Then `--dir` should be `/path/to/SAM`.

# DAVIS 2017

The DAVIS 2017 can be downloaded [here](https://davischallenge.org/davis2017/code.html).

However, unfortunately some annotation PNGs are in bad format. To fix, install following two tools:

- [pngcheck](http://www.libpng.org/pub/png/apps/pngcheck.html) for checking if a png file is damaged.
- [imagemagick](https://imagemagick.org/) to use its [convert](https://imagemagick.org/script/convert.php) tool to fix damaged png files.

and run

```
bash fixpng.sh <path to DAVIS annotation folder>
```

After fixing all annotation PNGs, run

```
go run main.go davis \
    --s3-region <your S3 region> \
    --s3-bucket <your S3 bucket> \
    --s3-key-prefix <your S3 folder> \
    -o <path to save the nutsh format JSON> \
    --video-dir <path to DAVIS video folder> \
    --anno-dir <path to DAVIS annotation folder>
```

For example, if the [semi-supervised TrainVal Full-Resolution](https://data.vision.ee.ethz.ch/csergi/share/davis/DAVIS-2017-trainval-Full-Resolution.zip) data is downloaded and unzipped, the folder structure should be like

```
- /path/to/DAVIS
    - Annotations
        - Full-Resolution
            - bear
            - boat
            ...
    - JPEGImages
        - Full-Resolution
            - bear
            - boat
            ...
```

then `--video-dir` should be `/path/to/DAVIS/JPEGImages/Full-Resolution` and `--anno-dir` should be `/path/to/DAVIS/Annotations/Full-Resolution`.

# YouTube-VOS

The YouTube-VOS databset can be downloaded [here](https://codalab.lisn.upsaclay.fr/competitions/6064#learn_the_details). It has the same data format and folder structure as DAVIS 2017, therefore to convert it is the same as converting the [latter](#davis-2017).
