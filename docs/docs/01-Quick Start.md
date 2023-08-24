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
