This guide provides a method to deploy Nutsh on AWS EC2 and make it accessible from the internet. While there are various deployment methods, this serves as a helpful reference.

## Core-only Deployment

Deploy the nutsh core if you don't require machine learning assistance which requires GPUs.

### Launching an EC2 Instance

Follow the AWS [official tutorial](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html) to launch an EC2 instance. To benefit from the [AWS Free Tier](https://aws.amazon.com/free), and if your workload is light, consider these settings:

- Machine Image: `Amazon Linux` which is the default.
- Instance type: `t2.micro` which is the cheapest.
- Storage: `30G` which is the default.

Feel free to increase the configuration based on your needs.

### Installing the Core Binary

After launching an instance, `ssh` into it and run the following command to install nutsh:

```bash
eval "$(curl -sSL nutsh.ai/install)"
```

Verify the installation by:

```bash
nutsh version
```

### Starting the Server

We will start the nutsh server in a [GNU screen](https://www.gnu.org/software/screen/) in order to keep it running after disconnecting from the machine:

```bash
screen -dmS nutsh nutsh
```

Verify the server is running with `screen -ls`. If successful, you should see:

```
There is a screen on:
	<PID>.nutsh	(Detached)
```

You can attach to this process by running

```bash
screen -r nutsh
```

To detach, press <kbd>Ctrl</kbd> <kbd>A</kbd> followed by <kbd>D</kbd>.

:::info

For more GNU screen commands, consult a [screen cheat sheet](https://kapeli.com/cheat_sheets/screen.docset/Contents/Resources/Documents/index).

:::

### Configuring a Proxy with Nginx

To make nutsh accessible from internet, we use [Nginx](http://nginx.org/) as a proxy between the machine's public `80` port and nutsh's local listening port `12345`.

:::caution

Starting nutsh by `nutsh --port 80` will resuilt in an error saying `listen tcp :80: bind: permission denied`.

:::

Install Nginx by:

```bash
sudo yum update && sudo yum install -y nginx && sudo service nginx start
```

Verify Nginx is running:

```bash
sudo service nginx status
```

You should see a green `active (running)`.

Retrieve the public hostname of the current instance to allow visiting the server by a url:

```bash
PUBLIC_HOSTNAME=$(TOKEN=`curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` && curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/public-hostname) && echo $PUBLIC_HOSTNAME
```

:::info

Check AWS [retrieve instance metadata](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html) tutorial on how to retrieve metadata from within an instance.

:::

Since the AWS public hostname is typically very long, we need to increase the Nginx server name hash buffer size:

```bash
echo "server_names_hash_bucket_size 128;" | sudo tee /etc/nginx/conf.d/global.conf > /dev/null
```

Now create a new nginx configuration file for our new site:

```bash
echo "server {
    server_name $PUBLIC_HOSTNAME;
    location / {
        proxy_pass http://localhost:12346;
    }
}" | sudo tee /etc/nginx/conf.d/nutsh.conf > /dev/null
```

Reload Nginx:

```bash
sudo service nginx reload
```

Nutsh should now be accessible at:

```bash
echo http://$PUBLIC_HOSTNAME
```

## Full Deployment with the SAM Module

With the SAM module you can utilize the smart segmentation tool to facilitate your workflow. The machine deploying the SAM module need to have at least one GPU.

### Launch an EC2 GPU Instance

Take the following settings as a reference:

- Machine image: `Deep Learning AMI GPU PyTorch 2.0.1 (Ubuntu 20.04) 20230827`, which will have all necessary CUDA and Python environments ready.
- Instance type: `p3.2xlarge`, which is the most lightweight and cheapest among [all recommended GPU instances](https://docs.aws.amazon.com/dlami/latest/devguide/gpu.html).
- Storage: `45G` which is the default.

Feel free to modify the configuration based on your situation.

:::info

You may have noticed that there is also a [P2 GPU instance](https://aws.amazon.com/ec2/instance-types/p2/). However, it is not ready to use out of the box since [the AWS Deep Learning AMI](https://aws.amazon.com/releasenotes/aws-deep-learning-ami-gpu-pytorch-2-0-ubuntu-20-04/) does not support it.

:::

After successfully launching and connecting to the machine, make sure `nvidia-smi` shows the desired GPUs.

### Install the Core and SAM Module Binaries

Retrieve the latest nutsh release by:

```bash
NUTSH_REPO="SysCV/nutsh" && \
NUTSH_VERSION=$(curl -s https://api.github.com/repos/${NUTSH_REPO}/releases/latest | grep 'tag_name' | awk -F '"' '{print $4}') && \
echo $NUTSH_VERSION
```

Download the binaries of the core and the SAM module to current directory:

```bash
curl -sSL "https://github.com/${NUTSH_REPO}/releases/download/${NUTSH_VERSION}/nutsh-sam-$(uname -s)-$(uname -m)" -o nutsh-sam && \
curl -sSL "https://github.com/${NUTSH_REPO}/releases/download/${NUTSH_VERSION}/nutsh-$(uname -s)-$(uname -m)" -o nutsh && \
chmod +x nutsh
chmod +x nutsh-sam
```

You can ignore the following warning if it appaers:

```
curl: /opt/conda/envs/pytorch/lib/libcurl.so.4: no version information available (required by curl)
```

After the download is successful, move the binaries to somewhere in `$PATH`:

```bash
sudo mv -t /usr/local/bin nutsh nutsh-sam
```

### Preparing the SAM Module

Before starting the SAM module, we need to make its dependences ready, such as the quantized SAM checkpoint.

First let's create a folder to store the assets required by the SAM module.

```bash
NUTSH_SAM_FOLDER=~/.nutsh-sam && \
mkdir $NUTSH_SAM_FOLDER
```

Download the (largest) SAM checkpoint:

```bash
NUTSH_SAM_MODEL_TYPE="vit_h" && \
NUTSH_SAM_MODEL_HASH="4b8939" && \
wget -P ${NUTSH_SAM_FOLDER} https://dl.fbaipublicfiles.com/segment_anything/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}.pth
```

Install Python requirements:

```bash
nutsh-sam requirements > ${NUTSH_SAM_FOLDER}/requirements.txt && \
pip install -r ${NUTSH_SAM_FOLDER}/requirements.txt
```

Quantize the SAM checkpoint:

```bash
nutsh-sam quantize \
    --model-type ${NUTSH_SAM_MODEL_TYPE} \
    --model-checkpoint ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}.pth \
    --decoder-path ${NUTSH_SAM_FOLDER}/sam_${NUTSH_SAM_MODEL_TYPE}_${NUTSH_SAM_MODEL_HASH}_decoder.onnx
```

Now we have all we need in hand.

### Starting the Servers

We start the SAM module and then the core in turn. Start the SAM module first by:

```bash
screen -dmS nutsh-sam \
    nutsh-sam start \
    --model-type ${NUTSH_SAM_MODEL_TYPE} \
    --model-checkpoint ${NUTSH_SAM_FOLDER}/sam_vit_h_4b8939.pth \
    --decoder-path ${NUTSH_SAM_FOLDER}/sam_vit_h_4b8939_decoder.onnx \
    --devices cuda:0 \
    --devices cuda:0
```

:::tip

One SAM instance requires no more than 8GB GPU memory. A ``p3.2xlarge` has a NVIDIA V100 GPU of 16GB memory, thus we can safely specify two `--devices cuda:0` flags to deploy two SAM instances on that GPU, resulting in being capable of running two inferences in parallel. You can adjust your specification of `--devices` flags based on your own case.

:::

Check if the SAM module is successfully running by:

```bash
screen -r nutsh-sam
```

Things are working if some `Running on http://127.0.0.1:xxx` are presented, whose number should be equal to that of the `--devices` flags. Detach the screen by pressing <kbd>Ctrl</kbd> <kbd>A</kbd> followed by <kbd>D</kbd>.

By default the SAM module will listen on port `12345`. Start the nutsh core connecting to it:

```bash
screen -dmS nutsh nutsh --online-segmentation localhost:12345
```

Check the core is running by:

```bash
screen -r nutsh
```

Press <kbd>Ctrl</kbd> <kbd>A</kbd> followed by <kbd>D</kbd> to detach.

### Configuring a Proxy with Nginx

As deploying the core in the previous section, we use Nginx to expose the local server to the public. Unlike before which is working on a Amazon Linux machine, now we are working on a Ubuntu machine, thus need to use `apt` instead of `yum` to install the Nginx.

```bash
sudo apt update && sudo apt install -y nginx && sudo service nginx start
```

Now follow the same steps in [configuring a proxy for core-only deployment](#configuring-a-proxy-with-nginx) to make your deployment publicly accessible.
