PROJECT_DIR:=$(realpath $(dir $(lastword $(MAKEFILE_LIST)))/../../)
# Set this env var to empty string if you have local cRPD, XRd container images
export IMAGE_PATH?=ghcr.io/stratoweave/
# Host port for the sorespo HTTP port 80 (APIs + embedded Web UI) on sweave.
export WEBUI_PORT?=3000
# Docker publish spec (host address and port) for that port. Loopback by
# default: the HTTP API has no authentication. To listen on all interfaces set
# WEBUI_PUBLISH=$(WEBUI_PORT) (no address), or e.g. WEBUI_PUBLISH=10.0.0.5:3000
# for one address. (containerlab drops empty variables, so the address cannot
# be a separate variable.)
export WEBUI_PUBLISH?=127.0.0.1:$(WEBUI_PORT)

ifeq (true,$(REMOTE_CONTAINERS))
CLAB_BIN:=containerlab
else ifeq (true,$(CODESPACES))
CLAB_BIN:=containerlab
else

CLAB_VERSION?=0.78.0
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
    -e WEBUI_PORT=$(WEBUI_PORT) \
    -e WEBUI_PUBLISH=$(WEBUI_PUBLISH) \
    -w $(CURDIR) \
    $(CLAB_CONTAINER_IMAGE) containerlab
endif
