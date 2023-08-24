#!/bin/bash

# Define the application and its repository
APP_NAME="nutsh"
REPO_NAME="SysCV/nutsh"

# Define ANSI color codes for colored terminal outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;36m'
NO_COLOR='\033[0m'

main() {
    # Check if the application is already installed
    if which ${APP_NAME} > /dev/null; then
        APP_PATH=$(which ${APP_NAME})
        echo -e "${RED}${APP_NAME} is already installed at [${APP_PATH}]. Please remove the existing version before installing a new one.${NO_COLOR}"
        return
    fi

    # Retrieve the latest version of the application from GitHub
    LATEST_VERSION=$(curl -s https://api.github.com/repos/${REPO_NAME}/releases/latest | grep 'tag_name' | awk -F '"' '{print $4}')

    if [ -z "${LATEST_VERSION}" ]; then
        echo -e "${RED}Could not fetch the latest version of ${APP_NAME}. Ensure https://github.com/${REPO_NAME}/releases is accessible.${NO_COLOR}"
        return
    fi

    echo "Found latest version: ${LATEST_VERSION}"

    # Identify the OS and architecture
    OS_TYPE=$(uname -s)
    ARCH_TYPE=$(uname -m)

    if [[ "${OS_TYPE}" != "Darwin" && "${OS_TYPE}" != "Linux" ]]; then
        echo -e "${RED}Unsupported OS: ${OS_TYPE}${NO_COLOR}"
        return
    fi

    if [[ "${ARCH_TYPE}" != "x86_64" && "${ARCH_TYPE}" != "arm64" ]]; then
        echo -e "${RED}Unsupported architecture: ${ARCH_TYPE}${NO_COLOR}"
        return
    fi

    # Construct the download URL based on the identified parameters
    DOWNLOAD_URL="https://github.com/${REPO_NAME}/releases/download/${LATEST_VERSION}/${APP_NAME}-${OS_TYPE}-${ARCH_TYPE}"
    echo "Downloading from ${DOWNLOAD_URL}"

    # Prepare local storage for the application
    INSTALL_PATH="$HOME/.${APP_NAME}/bin"
    mkdir -p ${INSTALL_PATH}

    # Download the application from GitHub
    curl --progress-bar -L ${DOWNLOAD_URL} -o "${INSTALL_PATH}/${APP_NAME}"

    # Grant execute permissions to the downloaded binary
    chmod +x "${INSTALL_PATH}/${APP_NAME}"
    echo "${APP_NAME} has been installed to ${INSTALL_PATH}"

    # If the application isn't discoverable, modify the shell configuration to include its path
    if ! which ${APP_NAME} > /dev/null; then
        if [[ $SHELL == *"bash"* ]]; then
            echo "export PATH=\"${INSTALL_PATH}:\$PATH\"" >> $HOME/.bashrc
            source $HOME/.bashrc
            echo "Added ${INSTALL_PATH} to $HOME/.bashrc"
        elif [[ $SHELL == *"zsh"* ]]; then
            echo "export PATH=\"${INSTALL_PATH}:\$PATH\"" >> $HOME/.zshrc
            source $HOME/.zshrc
            echo "Added ${INSTALL_PATH} to $HOME/.zshrc"
        else
            echo -e "${RED}Unrecognized shell. Manually add ${INSTALL_PATH} to your PATH.${NO_COLOR}"
        fi
    fi

    # Confirm successful installation
    if [ -f "${INSTALL_PATH}/${APP_NAME}" ]; then
        echo -e "${GREEN}Installation succeeded! Start ${APP_NAME} by running:${NO_COLOR}"
        echo -e "\n  ${BLUE}${APP_NAME}${NO_COLOR}\n"
    else
        echo -e "${RED}Installation failed!${NO_COLOR}"
    fi
}

main "$@"