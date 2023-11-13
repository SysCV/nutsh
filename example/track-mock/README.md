A mocking implementation of a tracking service which does nothing but for the purpose of showing the usage of nutsh Python SDK.

To start, run the following commands in sequence.

```
conda create --name nutsh-track-mock python=3.10
```

```
conda activate nutsh-track-mock
```

```
pip install nutsh
```

```
python main.py
```

After the server is running, start nutsh core with the `--track` flag set to `localhost:12348`. (Replace `localhost` to the actual address of the machine deploying this server if necessary.)
