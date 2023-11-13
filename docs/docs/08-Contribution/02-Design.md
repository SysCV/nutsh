Here, we outline the high-level philosophy guiding the development of this project to help you understand the conceptual framework.

The abstract workflow of a human-machine interactive annotation process in its most refined form involves the following ingredients:

- A **resource** to be annotated.
- A desired **annotation** to be created from a specific perspective of truth.
- An annotation consists of some **entities**, each representing a single piece of truth in the given perspective.
- The final annotation is fulfilled in an accumulating fashion by merging **patches** provided by agents, which can be either humans or machines.
- A human directly generates annotation patches by reviewing the resource.
- A machine provides predicted patches given the resource and some optional human **prompts**.
- A human can double-check a machine prediction to give a corrected patch to the annotation, together with some **corrections**.
- A machine can utilize these human corrections to evolve.

This is a very general abstraction. Let's take video instance segmentation as a concrete example. Here:

- Resources are videos.
- The annotation is a collection of identified instances as entities, represented in masks across and within frames.
- During drawing, every commit contributes a patch to the final finished annotation.
- Any segmentation model, e.g. [SAM](https://segment-anything.com/), can assist.
- Humans can provide prompts like points or boxes to instruct the model prediction.
- Humans can also correct machine predictions by modifying its outputs before committing.
- The segmentation model in use can be fine-tuned after collecting enough corrections.

Given this abstraction, the essential duty of a tool to facilitate such a process is clear:

- Render resources and annotations.
- Allow for the manipulation of annotations.
- Integrate models.
- Allow for the correction of model predictions and collect these corrections.
- Fine-tune the model.

Nutsh's implementation is guided by this general abstraction, as evidenced by details such as:

- Resources and annotations are completely decoupled. They are stored and rendered separately.
  Think of the rendering of a resource as a background canvas upon which the user can draw whatever annotations, although only certain combinations make sense.
- The integration of models is defined through interfaces, allowing for the integration of arbitrary model implementations in the future.
- The corrections to models are also defined through interfaces, making them model-agnostic.

At the time of writing, only a limited set of concrete realizations have been implemented. However, we hope that this abstraction is sufficiently general to accommodate future implementations.
