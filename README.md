[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

<p align="center"><img width=250 src="app/frontend/public/banner.svg" /></p>

<p align="center">
    <a href="https://nutsh.ai/app">Demo</a>
    ·
    <a href="https://nutsh.ai/docs/Quick%20Start">Doc</a>
    ·
    <a href="https://github.com/SysCV/nutsh/discussions">Discussion</a>
  </p>



https://github.com/SysCV/nutsh/assets/1063562/3e453f9a-df79-42fd-b629-cdc76fe8249d


  
`nutsh` is a platform designed for visual learning through human feedback. With a user-friendly interface and API, it supports a range of visual modalities, diverse human input methods, and learning mechanisms based on human feedback.

The project is currently in its early stages and under active development. Your feedback is highly appreciated.

### Main features

- ✅ Intuitive Interface
  - ✅ Modern frontend design
  - ⬜ Easy custom model integration (coming)
- ✅ Multiple Visual Modalities
  - ✅ Images
  - ✅ Videos
  - ⬜ ... (coming)
- ✅ Diverse Annotations
  - ✅ Masks
  - ✅ Polygons and polylines
  - ✅ Bounding boxes
- ✅ Versatile Scenarios
  - ✅ Object tracking
  - ✅ Object parts linking
- ✅ Model-assisted Segmentation
  - ✅ Integration with [Segment Anything Model](https://segment-anything.com/)
  - ✅ Positive and negative point prompts
  - ✅ Focus on specific local areas
- ✅ Learning from Human Feedback
  - ✅ Model fine-tuning based on user feedback

# Install

```bash
eval "$(curl -sSL nutsh.ai/install)"
```

> Refer to the [quick start documentation](https://nutsh.ai/docs/Quick%20Start) for a more comprehensive guide.

# Quick Overview

https://github.com/SysCV/nutsh/assets/1113875/55925677-57ff-4870-b853-d67c80517eb7

# Diverse Annotations and Versatile Scenarios

## Drawing Polygons

In addition to standard polygon operations, Bézier curves are supported, enabling precise annotations of curved objects, such as tires.

https://github.com/SysCV/nutsh/assets/1113875/594139a8-b5ad-47d7-a87b-01a5eb699ae5

## Drawing masks

Create masks with pixel-level accuracy, ensuring a perfect fit with no gaps or overlaps.

https://github.com/SysCV/nutsh/assets/1113875/c9977bd7-7700-4f71-97ba-6a2bd2084db5

## Tracking Objects

Especially useful when annotating videos, the platform offers an effortless way to track objects across frames.

https://github.com/SysCV/nutsh/assets/1113875/849b0017-88a9-41a5-b415-bd11475e9e0e

## Linking Object Parts

Objects obscured by others, resulting in fragmented representation, can easily be linked to form a cohesive annotation

https://github.com/SysCV/nutsh/assets/1113875/f94b0ac2-4c3b-4513-ac92-b3cb531c41f4

# Convenient Shortcuts

The platform incorporates various shortcuts, streamlining the annotation process for enhanced speed and accuracy.

## Cloning Slice

For polygons sharing a common edge segment, one can be cloned for the other, ensuring a seamless fit without any gaps or overlaps.

https://github.com/SysCV/nutsh/assets/1113875/b13ebac0-921d-4ad4-96fb-9bc33669143c

## Interpolation

Given two annotations of the same type on both a start and an end frame, heuristic interpolation can automatically generate all intermediate annotations.

https://github.com/SysCV/nutsh/assets/1113875/6d625d24-b824-4107-9e70-4685c8dc38d9

# Model-Assisted Segmentation

We offer an API that seamlessly integrates the human labeling interface with deep learning models. Our server facilitates model inference and tuning based on user input. Calculations can be executed on both CPU and GPU platforms.

For instance, our [SAM module](https://nutsh.ai/docs/sam) taps into the [Segment Anything Model](https://segment-anything.com/) from Meta AI to enhance segmentation speed and efficiency. While the SAM models are openly accessible to the public, their labeling interface remains proprietary. We also offer advanced features, such as local prediction, to ensure top-notch segmentation results. For a detailed guide, please refer to our documentation.

## Global Smart Segmentation

Leverage deep learning models to perform segmentation tasks across entire images, aiding the segmentation process.

https://github.com/SysCV/nutsh/assets/1113875/c64913d8-6422-40b4-bb4b-8e35f86f9af1

## Local Smart Segmentation

Direct your attention to specific regions of an image and request the model to generate segmentation predictions for that particular section.
Such localized predictions often yield more detailed segmentations.

https://github.com/SysCV/nutsh/assets/1113875/b486d6ac-a462-4d6b-aecd-d992055855a9

# Learning from Human Feedback

In addition to utilizing prompts for refining predictions, users can make subsequent adjustments to these predictions. By gathering these modifications, you can train a model that's fine-tuned to your specific needs. Our SAM module comes equipped with features that assist in [fine-tuning the SAM decoder](https://nutsh.ai/docs/SAM%20Module#sam-decoder-fine-tuning) seamlessly.

https://github.com/SysCV/nutsh/assets/1113875/2f9c8765-e1bf-4c6d-8e64-91724ac088a3

# Next Steps

Consult [the documentation](https://nutsh.ai/docs/) for further information, including:

- [Core Concepts](https://nutsh.ai/docs/Concept)
- [Usage Guidelines](https://nutsh.ai/docs/Usage/Project)
- [Project Serialization](https://nutsh.ai/docs/Serialization)
- [The SAM Module](https://nutsh.ai/docs/SAM%20Module)
- [Contribution Guidelines](https://nutsh.ai/docs/Contribution/Build)

and more!

# Citation

If you find the platform useful for your research projects, please cite

```
@misc{nutsh,
  title = {nutsh: A Platform for Visual Learning from Human Feedback},
  author = {Xu Han and Fisher Yu},
  howpublished = {\url{https://github.com/SysCV/nutsh}},
  year = {2023}
}
```
