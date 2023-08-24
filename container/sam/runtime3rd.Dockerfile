FROM pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
ADD module/sam/requirements.txt /requirements.txt
RUN \
    apt-get update && apt-get install git gcc -y && \
    pip install -r /requirements.txt
