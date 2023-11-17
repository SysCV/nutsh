Nutsh is a command-line application that consists of a primary executable known as its "_core_".
This core is augmented with pluggable "_modules_" that add extra capabilities, like machine-assisted segmentation.

## Core

The core of Nutsh is a fully-featured application without needing any other runtime dependencies. Take the following steps to launch the core:

0. Retrieve the latest release version and set some variables:

   ```bash
   NUTSH_REPO="SysCV/nutsh" && \
   NUTSH_VERSION=$(curl -s https://api.github.com/repos/${NUTSH_REPO}/releases/latest | grep 'tag_name' | awk -F '"' '{print $4}') && \
   echo $NUTSH_VERSION
   ```

1. Download the executable:

   ```bash
   curl -sSL "https://github.com/${NUTSH_REPO}/releases/download/${NUTSH_VERSION}/nutsh-$(uname -s)-$(uname -m)" -o nutsh && \
   chmod +x nutsh
   ```

2. Position the executable in `$PATH`:

   ```bash
   sudo mv nutsh /usr/local/bin
   ```

3. Start:

   ```bash
   nutsh
   ```

By default, Nutsh listens on port `12346` and uses `$HOME/.nutsh` as its workspace. To access Nutsh locally, open `localhost:12346` in your browser. If you've deployed Nutsh on a remote machine, replace `localhost` with the machine's IP address.

For additional usage instructions and configuration options, use the `nutsh -h` command.

## SAM Module

If GPUs are available, you can further enhance Nutsh by launching the [SAM module](/SAM%20Module) to facilitate image segmentation. This module leverages the [Segment Anything Model](https://segment-anything.com/) by Meta AI.

:::note

Although you can technically launch it on CPUs as well, be aware that the inference speed will be significantly slower compared to running on GPUs.

:::

To launch the SAM module, follow these steps:

0. Retrieve the latest release version and set some variables:

   ```bash
   NUTSH_REPO="SysCV/nutsh" && \
   NUTSH_VERSION=$(curl -s https://api.github.com/repos/${NUTSH_REPO}/releases/latest | grep 'tag_name' | awk -F '"' '{print $4}') && \
   echo $NUTSH_VERSION
   ```

1. Download the SAM module executable:

   ```bash
   curl -sSL "https://github.com/${NUTSH_REPO}/releases/download/${NUTSH_VERSION}/nutsh-sam-$(uname -s)-$(uname -m)" -o nutsh-sam && \
   chmod +x nutsh-sam
   ```

2. Position the executable in `$PATH`:

   ```bash
   sudo mv nutsh-sam /usr/local/bin
   ```

3. Prepare the resources for starting the SAM module.

   1. Prepare a folder with sufficient space to store resources such as model checkpoints. For this quick start demo we use a temporary directory:

      ```bash
      NUTSH_SAM_FOLDER=$(mktemp -d)
      ```

   2. Download one of the three [SAM model checkpoints](https://github.com/facebookresearch/segment-anything#model-checkpoints) if you don't already have one. For this example, we'll use the largest model `vit_h`:

      ```bash
      NUTSH_SAM_MODEL_TYPE="vit_h" && \
      NUTSH_SAM_MODEL_HASH="4b8939" && \
      wget -P ${NUTSH_SAM_FOLDER} https://dl.fbaipublicfiles.com/segment_anything/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}.pth
      ```

4. Prepare the Python environment with [conda](https://docs.conda.io/en/latest/), or choose another preferred method:

   ```bash
   conda create --name nutsh-sam -y python=3.10 && \
   conda activate nutsh-sam && \
   nutsh-sam requirements > ${NUTSH_SAM_FOLDER}/requirements.txt && \
   pip install -r ${NUTSH_SAM_FOLDER}/requirements.txt
   ```

5. Generate the quantized decoder if not already available:

   ```bash
   nutsh-sam quantize \
       --model-type ${NUTSH_SAM_MODEL_TYPE} \
       --model-checkpoint ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}.pth \
       --decoder-path ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}_decoder.onnx
   ```

6. Start the module, which will listen on port `12345` by default:

   ```bash
   nutsh-sam start \
       --model-type ${NUTSH_SAM_MODEL_TYPE} \
       --model-checkpoint ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}.pth \
       --decoder-path ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}_decoder.onnx \
       --devices cuda:0
   ```

After the SAM module is up and running, open a new terminal session, start the core and connect it to the SAM module by providing the module's address using the `--online-segmentation` flag:

```bash
nutsh --online-segmentation localhost:12345 # ... other flags
```

Replace `localhost` with the actual IP address if the SAM module is deployed on a different machine.

If all processes run smoothly, the [Smart Segmentation](/Usage/Video/Smart%20Segmentation) tool will be enabled on the frontend. For further details about the SAM module, see the [SAM Module documentation](/SAM%20Module).

## Track Module

The SAM module offers a great help in segmentation within a single image. In a video segmentation scenario, however, it further requires identifying masks across frames, when SAM along is incapable of.
It is where the track module can join the game.

Essentially the track module allows [integrating any custom models or implementations](/Custom%20Model%20Integration/Tracking). For the quick start purpose, we will launch our example [AOT Tracker](https://github.com/SysCV/nutsh/tree/main/example/track-aot) based on codes from [Segment-and-Track-Anything](https://github.com/z-x-yang/Segment-and-Track-Anything).

:::info

Run the following commands in the folder `example/track-aot`. Take the `README.md` there as the canonical reference.
:::

1. Prepare a conda virtual environment and activate it.

   ```
   conda create --name nutsh-track -y python=3.10 && \
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

8. Start the server.

   ```
   python -m src.main
   ```

   :::caution

   On an Apple Silicon computer you may run into an error saying

   ```
   symbol not found in flat namespace '_CFDataGetBytes'
   ```

   It is because the `CoreFoudnation` framework, which is required by gRPC that nutsh uses behind the scene, is [not available](https://dev.to/ankitsahu/installing-ml-agents-on-macos-m1-a-troubleshooting-guide-793) on Apple Silicon Macs by default.
   To solve this, run the following command:

   ```
   pip uninstall grpcio && \
   GRPC_PYTHON_LDFLAGS=" -framework CoreFoundation" pip install grpcio --no-binary :all:
   ```

   :::

If everything goes well, you will see a log saying the server is listenning on the default port `12348`. Now you can start the core and connect it to the track module by providing the module's address using the `--track` flag:

```bash
nutsh --track localhost:12348 # ... other flags
```
