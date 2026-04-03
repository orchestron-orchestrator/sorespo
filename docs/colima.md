# Running SORESPO on macOS With Colima

[Colima](https://colima.run) is a container runtime for macOS,
it's open-source and much more lightweight than Docker Desktop.
Both the Nokia SR Linux and Juniper cRPD test environments have
been found to run well on Colima. At the time of writing,
no Cisco XRd image is available for aarch64, so the main `quicklab`
will not run on macOS.


## Installation
Install Colima with [Homebrew](https://brew.sh/):
```shell
brew install colima docker
colima start --cpu 4 --memory 8
colima status
```

## Kernel Modules for cRPD

For Juniper cRPD-based labs, install the extra kernel modules inside the Colima VM so
`vrf` and `mpls_iptunnel` are available:

```shell
colima ssh
sudo apt update
sudo apt install linux-modules-extra-$(uname -r)
exit
```

If you recreate the Colima VM or it boots into a new kernel, repeat this step.

## Next

Continue with [Running SORESPO on macOS](tutorials/run-on-macos.md) or
[Developing SORESPO on macOS](tutorials/develop-on-macos.md).
