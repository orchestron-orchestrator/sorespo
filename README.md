# RESPNET

RESPNET, the REalistic Service Provider Network, is an example of network automation to automate a rather realistic looking SP network. This repository contains a RESPNET implementation POC based on Orchestron.


## Getting started
- You need Acton installed, most likely the tip release, see https://acton.guide/install_tip.html
- `git clone git@github.com:orchestron-orchestrator/respnet.git` (if you haven't already)
- `make build`
- `cd test/quicklab`
- `make start`
- `make copy run-and-configure` - this will copy over a fresh version of the orchestron/respnet app and run it in the container part of the quicklab dev environment

So typical REPL loop is like 
- edit code
- in test/quicklab: `(cd ../../ && make build ) && make copy run-and-configure` and see the code run interactively

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/orchestron-orchestrator/respnet/tree/notconf?quickstart=1&devcontainer_path=.devcontainer%2Fdocker-in-docker%2Fdevcontainer.json)

## Running on ARM64 (and Apple silicon)

The default `quicklab` testenv uses a mix of Juniper cRPD and Cisco IOS XRd
containers for the core PE routers and Cisco IOS XRd for the CPE devices. This
works well on x86_64, but not so much on ARM64. With some emulation magic
Juniper cRPD actually works on Apple silicon and performs the network function,
but Cisco XRd 24.1.1 did not. Maybe that will change in future as I noodle with
it some more ...

To that end, the `quicklab-crpd` testenv contains only Juniper cRPD devices for
both PE and CPE. To run the containers natively on ARM64 make sure to download
the ARM64 container images from Juniper. Note how the `quicklab-crpd` testenv
contains no references to ARM64 - the container image referenced is a
[multi-arch manifest](https://www.docker.com/blog/multi-arch-build-and-images-the-simple-way/).
The docker client will pick up the image matching the runtime platform when
pulling images.

The smoothest method of running `quicklab-crpd` testenv on Apple silicon is to
use [colima](https://github.com/abiosoft/colima). It sets up a Linux ARM64 VM
with Docker inside, and configures your local environment to access the Docker
daemon seamlessly. The only caveat is the lack of the *vrf* and *mpls_iptunnel*
kernel modules in the VM. The default Ubuntu template for Colima uses a minimal
server image with the kernel modules missing. Without the *vrf* module the PE
cannot deal with the customer eBGP session in the customer VRF. The solution is
simple though - just install the `linux-modules-extra` package in the VM.

```shell
colima ssh
sudo apt update
sudo apt install linux-modules-extra-$(uname -r)
```

Then in your [favorite terminal emulator](https://ghostty.org) on MacOS:

```shell
# Install acton (tip)
make build-aarch64  # We're cross-compiling for aarch64 running in the Linux VM
make -C test/quicklab-crpd start
make -C test/quicklab-crpd copy run-and-configure
```
