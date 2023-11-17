from setuptools import setup, find_packages

setup(
    name='nutsh',
    version='0.0.1-4',
    url='https://nutsh.ai/',
    author='Xu Han',
    author_email='hxhxhx88@gmail.com',
    description='The Python SDK of nutsh.ai',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    packages=find_packages(),
    package_data={
        '': ['*.pyi', 'requirements.txt'],  # include all .pyi files
    },
    install_requires=[
        "grpcio-tools==1.59.2",
        "grpc-stubs==1.53.0.3",
        "requests==2.31.0"
    ],
)