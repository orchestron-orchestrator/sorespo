### Dev Containers

This repository includes a [Development Container](https://containers.dev)
configuration. The container image includes everything you need to get started,
apart from the licensed containerized router images. Use VS Code to open this
project and it will detect the dev container configuration automatically.

TL;DR: use:
- `.devcontainer/docker-in-docker/devcontainer.json` for GitHub Codespaces
- `.devcontainer/devcontainer.json` for local development

There are two flavors of the container:

1. *docker-outside-of-docker*: This is the default for local development.
   containerlab and other tools will run inside the dev container and will use
   the hosts Docker daemon for new containers. This means your dev container is
   a sibling to the testenv containers and you can also interact with the new
   containers from your host OS.
2. *docker-in-docker*: This is the default for Codespaces. The dev container
   runs its own nested Docker daemon so the containers you start for testenvs
   are only visible to the dev container.

If you're using GitHub Codespaces, use the *docker-in-docker* flavor.
