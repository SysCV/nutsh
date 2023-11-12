An example implementation of a tracking service using nutsh Python SDK.

# Runtime Environment

Take the following steps as an example to setup the runtim environment.

1. Prepare a conda virtual environment.

```
conda create --name nutsh-track python=3.10 -y && \
conda activate nutsh-track
```

2. Install `torch` and `torchvision` following [the official guide](https://pytorch.org/get-started/locally/).

3. Install other dependencies.

```
pip install -r requirements.txt
```

4. Download the [Segment-and-Track-Anything](https://github.com/z-x-yang/Segment-and-Track-Anything.git) model and extract the useful part for us.

```
git clone https://github.com/z-x-yang/Segment-and-Track-Anything.git vendor/Segment-and-Track-Anything && \
cd vendor/Segment-and-Track-Anything && git checkout 77354b5 && cd - && \
mv vendor/Segment-and-Track-Anything/aot vendor/aot && \
rm -rf vendor/Segment-and-Track-Anything
```

5. Install [Pytorch-Correlation-extension](https://github.com/ClementPinard/Pytorch-Correlation-extension.git) from its source code.

```
git clone https://github.com/ClementPinard/Pytorch-Correlation-extension.git vendor/Pytorch-Correlation-extension && \
cd vendor/Pytorch-Correlation-extension && \
git checkout 14a159e && \
python setup.py install && cd -
```

6. Download the model checkpoints.

```
mkdir -p local/ckpt && \
gdown --id '1QoChMkTVxdYZ_eBlZhK2acq9KMQZccPJ' --output local/ckpt/R50_DeAOTL_PRE_YTB_DAV.pth
```

7. Install nutsh Python SDK.

```
pip install nutsh
```
