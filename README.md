[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/sorespo.png "SORESPO Logo"

# SORESPO

The **SOmewhat REalistic Service Provider Orchestration** (SORESPO) network is
a rather realistic looking Service Provider network. This repository contains a
network automation system based on [Orchestron](https://github.com/orchestron-orchestrator/orchestron).

## Introduction
While SORESPO and Orchestron are closely related, they are two distinct
projects with very different goals:
* **Orchestron** is a ***platform*** for the development of robust network
orchestration systems based on model-driven declarative transforms. It does the
heavy lifting so you can focus on building automation that makes sense.
* **SORESPO** is a **reference implementation** of an Orchestron system. You
can use it to learn about network automation (development) or use it as a solid
foundation for your own network automation system design.

[orch-sorespo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/OrchSorespo.png "Orchestron and SORESPO Logo"

## Getting Started

Head over to our [tutorials](docs/tutorials/README.md) to get started with
running the SORESPO network and/or making your first changes to the code in
minutes!

## SORESPO Services

Today, SORESPO delivers an **IP core network, offering Layer 3 VPN services**.
The Customer Facing Service (CFS) model is an implementation of the IETF's
*YANG Data Model for L3VPN Service Delivery* defined in [RFC8299](https://datatracker.ietf.org/doc/rfc8299/).

L3VPN was chosen as a good service to start out with as it is a common, well
understood and overall useful service-provider use-case. But the Orchestron
platform is capable of implementing almost any automation use-case for any
domain. Over time, we expect to deliver more services as part of SORESPO. But
we will likewise deliver other reference implementations for many additional
use-cases. With these reference implementations we aim to make service
automation with Orchestron as simple as possible.

### Service Automation Layering

SORESPO implements highly abstracted device and service configuration through
layers of automation. While SORESPO is implemented using four discrete layers,
Orchestron does not place any limitations on the number of layers that can be
implemented - as few or many as necessary can be used.

```
                        +-------------------------------+
+-----------------------| RESTCONF Northbound Interface |-----------------------+
|                       +-------------------------------+                       |
|               +-----------------------------------------------+               |
|               |    Customer Facing Service (CFS) - Layer 0    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |            Intermediate - Layer 1             |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |    Resource Facing Service (RFS) - Layer 2    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |                Device - Layer 3               |               |
|               +-----------------------------------------------+               |
|                       +-------------------------------+                       |
+-----------------------|  NETCONF Southbound Interface |-----------------------+
                        +-------------------------------+
```

### Multi-vendor 
SORESPO's service stack is designed to be vendor-neutral. At this time the
following vendor & IP transport options are supported:
* [Juniper cRPD](https://www.juniper.net/documentation/product/us/en/crpd/)
  with IS-IS, iBGP, MPLS and LDP
* [Cisco IOS XRd](https://www.cisco.com/site/us/en/products/networking/sdwan-routers/ios-xrd/index.html)
  with IS-IS, iBGP, MPLS and LDP
* [Nokia SR Linux](https://www.nokia.com/ip-networks/service-router-linux-NOS/)
  with IS-IS, iBGP, VXLAN and BGP-EVPN

See our [lab documentation](test/README.md#quicklabs) on how run a
lab/development environment for each of these options.
