[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

<p align="center"><img width=250 src="app/frontend/public/banner.svg" /></p>

<p align="center">
    <a href="https://nutsh.ai/app">Demo</a>
    ·
    <a href="https://nutsh.ai/docs/Quick%20Start">Doc</a>
    ·
    <a href="https://github.com/SysCV/nutsh/discussions">Discussion</a>
  </p>
  
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

https://github.com/SysCV/nutsh/assets/1113875/20d160b4-9740-4fec-b85d-be26b46f25f3

# Diverse Annotations and Versatile Scenarios

## Drawing Polygons

In addition to standard polygon operations, Bézier curves are supported, enabling precise annotations of curved objects, such as tires.

https://github.com/SysCV/nutsh/assets/1113875/fb57016b-62b6-40d5-9637-aa2ab1e65fcc

## Drawing masks

Create masks with pixel-level accuracy, ensuring a perfect fit with no gaps or overlaps.

https://github.com/SysCV/nutsh/assets/1113875/b1c1e45f-493b-4a75-be55-c572774eba96

## Tracking Objects

Especially useful when annotating videos, the platform offers an effortless way to track objects across frames.

https://github.com/SysCV/nutsh/assets/1113875/43880c0c-94d0-4053-ac72-26128318e754

## Linking Object Parts

Objects obscured by others, resulting in fragmented representation, can easily be linked to form a cohesive annotation.

https://github.com/SysCV/nutsh/assets/1113875/c42ad2f3-7f08-481c-a996-db84f6281e1a

# Convenient Shortcuts

The platform incorporates various shortcuts, streamlining the annotation process for enhanced speed and accuracy.

## Cloning Slice

For polygons sharing a common edge segment, one can be cloned for the other, ensuring a seamless fit without any gaps or overlaps.

https://github.com/SysCV/nutsh/assets/1113875/8ec80320-97da-45b6-9c03-db687a1f00c8

## Interpolation

Given two annotations of the same type on both a start and an end frame, heuristic interpolation can automatically generate all intermediate annotations.

https://github.com/SysCV/nutsh/assets/1113875/9b78fad0-b020-44f5-9cca-781c566bce76

# Model-Assisted Segmentation

We offer an API that seamlessly integrates the human labeling interface with deep learning models. Our server facilitates model inference and tuning based on user input. Calculations can be executed on both CPU and GPU platforms.

For instance, our [SAM module](https://nutsh.ai/docs/sam) taps into the [Segment Anything Model](https://segment-anything.com/) from Meta AI to enhance segmentation speed and efficiency. While the SAM models are openly accessible to the public, their labeling interface remains proprietary. We also offer advanced features, such as local prediction, to ensure top-notch segmentation results. For a detailed guide, please refer to our documentation.

## Global Smart Segmentation

Leverage deep learning models to perform segmentation tasks across entire images, aiding the segmentation process.

https://github.com/SysCV/nutsh/assets/1113875/18b33fda-cd47-4977-a8f7-315ff8663345

## Local Smart Segmentation

Direct your attention to specific regions of an image and request the model to generate segmentation predictions for that particular section.
Such localized predictions often yield more detailed segmentations.

https://github.com/SysCV/nutsh/assets/1113875/d5f1b6ca-ecaa-46f3-8bfc-28666d17b338

# Learning from Human Feedback

In addition to utilizing prompts for refining predictions, users can make subsequent adjustments to these predictions. By gathering these modifications, you can train a model that's fine-tuned to your specific needs. Our SAM module comes equipped with features that assist in [fine-tuning the SAM decoder](https://nutsh.ai/docs/SAM%20Module#sam-decoder-fine-tuning) seamlessly.

https://github.com/SysCV/nutsh/assets/1113875/2b742260-f10d-4655-8b86-06e68a36fbe5

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
