An example implementation of a tracking service using nutsh Python SDK. The code is based on the [AOTTracker](https://github.com/z-x-yang/Segment-and-Track-Anything/blob/77354b586c8d24a116c76d7b80d55d3a0ae44927/aot_tracker.py) from [Segment-and-Track-Anything](https://github.com/z-x-yang/Segment-and-Track-Anything).

# Prepare

Take the following steps as an example to setup the runtim environment.

1. Prepare a conda virtual environment.

```
conda create --name nutsh-track python=3.10
```

Activate it.

```
conda activate nutsh-track
```

2. Install `torch` and `torchvision` following [the official guide](https://pytorch.org/get-started/locally/). For example, use the following command to install PyTorch CUDA 11.8 version on Linux.

```
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

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

# Start

Run the following command in the same folder of its README to start the server:

```
python -m src.main
```

With the default setting the server will use GPU 0 and start listenning on port 12348.
Now start your nutsh core with `--track` flag set to `${TRACK_SERVER_ADDR}:12348` to connect to your track server and enjoy auto tracking! (Replace `TRACK_SERVER_ADDR` to the machine deploying this server.)
