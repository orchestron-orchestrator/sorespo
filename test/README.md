# SORESPO Tests

## Quick Labs
SORESPO's service stack is designed to be vendor-neutral. At this time the
following vendor & IP tansport options are supported:
* [Juniper cRPD](https://www.juniper.net/documentation/product/us/en/crpd/)
with IS-IS, iBGP, MPLS and LDP
* [Cisco IOS XRd](https://www.cisco.com/site/us/en/products/networking/sdwan-routers/ios-xrd/index.html)
with IS-IS, iBGP, MPLS and LDP
* [Nokia SR Linux](https://www.nokia.com/ip-networks/service-router-linux-NOS/)
with IS-IS, iBGP, VXLAN and BGP-EVPN

This repository contains [Containerlab](https://containerlab.dev/)-based
labs/development environments for each of these vendor options which you can
run:
* **[quicklab](quicklab/README.md)** has a combination of Cisco IOS XRd and
  Juniper cRPD core routers
  * This lab is an example of a true multi-vendor IP transport network.
* **[quicklab-crpd](quicklab-crpd/README.md)** uses Juniper cRPD for the core &
  CPE routers
  * This lab is fully functional on Apple Silicon, making it ideal for local
    development on Mac.
* **[quicklab-srl](quicklab-srl/README.md)** has a combination of Nokia SR
  Linux core routers and [FRRouting](https://frrouting.org/) CPEs
  * This lab uses nothing but freely accessible software.
* **[quicklab-notconf](quicklab-notconf/README.md)** runs NOTCONF which
  simulates Cisco IOS XRd and  Juniper cRPD
  * This lab requires very few resources and runs on 100% open source software.

 ----
 *NOTE*: Obtaining Juniper cRPD and Cisco XRd requires an active vendor support
 contract, you will need to obtain the necessary images and licenses yourself.
 Nokia SR Linux is however freely available and therefor the main focus for our
 [tutorials](../docs/tutorials/README.md).

*NOTE*: The Nokia SR Linux lab topology and router configurations were heavily
inspired by [this](https://learn.srlinux.dev/tutorials/l3evpn/rt5-only) Nokia
SR Linux tutorial.

### Network Device Container Images

As outlined above, some of the labs include containerized routers (Juniper
cRPD, Cisco IOS XRd) that require an active vendor support contract to obtain
them. We are not allowed to distribute the images or the license files. Please
seek out access to the images and licenses through appropriate channels.

You may override the container image path by setting the `IMAGE_PATH`
environment variable to a prefix pointing to a private registry hosting the
container images. For example, if your Juniper cRPD exists in
`registry.example.org/containerlab/crpd:24.4R1.9`, then set the environment
variable `export IMAGE_PATH=registry.example.org/containerlab/`. Or if your
images only exist locally on your machine without a registry prefix, set the
environment variable `export IMAGE_PATH=`.

Juniper cRPD also requires a license file. The following options are available
for exposing the license file to Containerlab:
1. Place the license in `licenses/juniper_crpd24.lic` in the project root.
2. Place the license in `../licenses/juniper_crpd24.lic` relative to the
   project root (sibling directory).
3. If neither are found, the script will attempt to clone a sibling git
   repository from the same group / organization.