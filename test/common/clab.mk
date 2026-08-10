PROJECT_DIR:=$(realpath $(dir $(lastword $(MAKEFILE_LIST)))/../../)
# Set this env var to empty string if you have local cRPD, XRd container images
export IMAGE_PATH?=ghcr.io/stratoweave/
export WEBUI_IMAGE?=ghcr.io/stratoweave/sorespo-webui:tip
export WEBUI_PORT?=3000

ifeq (true,$(REMOTE_CONTAINERS))
CLAB_BIN:=containerlab
else ifeq (true,$(CODESPACES))
CLAB_BIN:=containerlab
else

CLAB_VERSION?=0.76.1
CLAB_CONTAINER_IMAGE?=ghcr.io/srl-labs/clab:$(CLAB_VERSION)
# ${HOME}/.docker is mounted (read-only) for registry credentials. On macOS
# (colima) it may also pick up the colima context from config.json, so we
# override it with "default" explicitly.
CLAB_BIN:=docker run --rm $(INTERACTIVE) --privileged \
    --network host \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /var/run/netns:/var/run/netns \
    -v /etc/hosts:/etc/hosts \
    -v /var/lib/docker/containers:/var/lib/docker/containers \
	-v ${HOME}/.docker:/root/.docker:ro \
    --pid="host" \
    -v $(PROJECT_DIR):$(PROJECT_DIR) \
    -e DOCKER_CONTEXT=default \
    -e IMAGE_PATH=$(IMAGE_PATH) \
    -e WEBUI_IMAGE=$(WEBUI_IMAGE) \
    -e WEBUI_PORT=$(WEBUI_PORT) \
    -w $(CURDIR) \
    $(CLAB_CONTAINER_IMAGE) containerlab
endif
