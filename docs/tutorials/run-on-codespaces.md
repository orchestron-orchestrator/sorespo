# Running SORESPO on GitHub Codespaces

## Introduction

SORESPO is a network automation system based on the Orchestron platform that
support configuring an IP network with L3VPN network services and manage the
full life cycle of the network, including core network infrastructure 
configuration. As part of the SORESPO git repository, there are a number of
*test environments*, offering virtual network topologies, based on 
containerized routers, for testing, development and demoing.

This document will take you through starting the virtual network lab based on
Nokia SR Linux devices and provisioning it with the SORESPO network 
automation system. 

GitHub Codespaces is a VM managed by GitHub that runs the Dev Container (part
of this project) and Visual Studio Code that is made available in your browser
or as a Remote environment you connect to from your local VS Code.

To start your codespace you will need a free GitHub account. Your GitHub
account includes a free monthly quota of compute hours. You will need to run a
machine with 4 CPU cores and 16 GB of RAM to be able to start the "Nokia SR
Linux" lab used throughout this tutorial. With the free *core hours* GitHub
provides (120 at the time of writing) you will be able to run the lab 30 hours
per month.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?devcontainer_path=.devcontainer%2Fdocker-in-docker%2Fdevcontainer.json&hide_repo_select=true&repo=872963408&skip_quickstart=true&machine=standardLinux32gb)

Setting up a fresh VM will take a couple of minutes. After is it done you have
access to VS Code running in a Dev Container with all the tools and source code
available in your browser.

## Starting the SORESPO Network

In the Terminal window go into the `/workspaces/sorespo/test/quicklab-srl`
directory and start the tutorial:
```shell
cd test/quicklab-srl
make tutorial
...
... # Containerlab starts the SR Linux lab, this may take a few minutes ...
...
Orchestron/sorespo running..
```

*NOTE*: Accept any browser pop-up that may appear the first time you try to
paste text into the in-browser VS Code.


This will first start the entire SR Linux network lab and finally run the
SORESPO system in the foreground in this shell window, which will show log 
output from SORESPO as it is working. You will need to **open a second
Teminal** to enter further commands and continue with the tutorial. Click the
*+* button in the top right of the VS Code Terminal window to do so.

*Note*: The lab can be shut down with `make stop`

At this stage, we have the lab topology with containerized routers running.
The only configuration loaded on the routers is for the management access and
credentials so that SORESPO can connect and send configuration. Otherwise, they
are unconfigured. The SORESPO system is also running but does not have any 
network or service intent configuration loaded, nor even any knowledge of the
devices themselves and thus has not communicated with them.

## Loading intent configuration into SORESPO

To configure the underlying routers and links, we load the configuration for
the initial core network topology. We use an XML configuration file that 
describes the intent for the network infrastructure, including the list of 
core routers and backbone links between them. Once provisioned, the network 
will be ready for customer service configuration.

In a new Terminal navigate to the `/workspaces/sorespo/test/quicklab-srl`
directory and load the configuration intent:
```shell
cd test/quicklab-srl
make send-config FILE="tutorial-netinfra.xml" 
```

Next we load the XML configuration for the customer's L3VPN service. This file
describes the intent, which is all that is needed to configure a customer's 
VPN across all three core routers, and the access links to the customer's sites.

```shell
make send-config FILE="tutorial-l3vpn-svc.xml" 
```

The resulting lab has three core SR Linux routers, each with an attached
customer edge running FRRouting. This diagram shows the topology:

```
+-------------------+                                                                     +-------------------+   
|    cust-1-frr     |                                                                     |    cust-3-frr     |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|    (FRRouting)    |                                                                     |    (FRRouting)    |   
+----+--------------+                                                                     +--+----------------+   
     |eth1                                                                                   |eth1       
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |ethernet1/3.100                                                    |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |ethernet1/2               |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Nokia SR Linux) |               ethernet1/1|  (Nokia SR Linux) |ethernet1/4.100                
                      +--+----------------+                          +--+--------------+-+                        
                         |ethernet1/1                                   |ethernet1/2        
                         |                                              |
                         |                                              |
                         |                                              |
                         |                            +-----------------+  
                         |                            |
                         |                            |      
                         |                            |      
                         |                            |          
                         |ethernet1/1                 |            
                      +--+----------------+ethernet1/2|           
                      |    fra-core-1     +-----------+
                      |     10.0.0.2      |
                      |  (Nokia SR Linux) +             
                      +---+---------------+                   
                          |ethernet1/4.100        
                          |
 +-------------------+    |
 |    cust-2-frr     |    | 
 |    10.200.1.2     +----+ 
 |    (FRRouting)    |eth1 
 +-------------------+                                                               
```


To test the above topology, you can log directly into a core router and run a
few commands.

Log in to the `ams-core-1` router:
```
make cli-ams-core-1
```

On the SR Linux CLI issue the following commands:
```
/ show network-instance default protocols bgp neighbor
ping network-instance default 10.0.0.2
```

These commands show that the loopback addresses are reachable and iBGP has been
established between the 3 core routers. Use *Ctrl+C* to stop the `ping` command
and `quit` to log out of the router.

*Note*: The [SR Linux Configuration Basics](https://documentation.nokia.com/srlinux/24-3/title/basics.html)
are a great introduction to the Nokia SR Linux CLI.

In the next section, we will look at the contents of the two XML configuration
files we just loaded. We will review step-by-step how layered automation
enables SORESPO to configure a complete Service Provider network from a
high-level intent.

## Service Automation Layering In SORESPO

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


The SORESPO system implements a RESTCONF northbound interface, which is
model-driven by Orchestron based on the top-level CFS YANG model of the SORESPO
system.

For many common queries and tasks, `make` targets are implemented to send the
relevant RESTCONF requests. 


### Configuration at Layer 0 - Customer Facing Service (CFS)

The Customer Facing Service (top-level) YANG model defines SORESPO's northbound
interface for users and/or BSS/OSS platforms. The YANG modules for `layer0` are
located in `sorespo/gen/yang/cfs`.

We can retrieve the top-level (CFS) configuration (`layer0`) from SORESPO
using the following command:

```shell
make get-config0
```

*Note*: XML is used for all of the examples throughout this tutorial, but if
you prefer JSON format, use:
```shell
make get-config-json0
```

The resulting output has two top-level containers, `<netinfra>` (the first
configuration file we loaded above), which describes the configuration of the
network devices and topology, and `<l3vpn-svc>` (the second loaded
configuration file) which is an implementation of `ietf-l3vpn-svc.yang` defined
in RFC8299. This is used to define the VPNs, customer attachment points and
other parameters necessary for provisioning customer L3VPN services.

```xml
<netinfra xmlns="http://example.com/netinfra">
...
</netinfra>
<l3vpn-svc xmlns="urn:ietf:params:xml:ns:yang:ietf-l3vpn-svc">
...
</l3vpn-svc>
```


#### Core Network Topology Configuration `<netinfra>`

`<netinfra>` holds the router and backbone link configuration. At `layer0`,
this is highly abstracted with only the essential parameters being exposed.
The other automation layers implement the logic necessary to create the device
level configuration (described by vendor supplied YANG modules).

```xml
<netinfra xmlns="http://example.com/netinfra">
  <router>
    <name>AMS-CORE-1</name>
    <id>1</id>
    <role>edge</role>
    <asn>65001</asn>
  </router>
  ...
  <backbone-link>
    <left-router>AMS-CORE-1</left-router>
    <left-interface>ethernet1-1</left-interface>
    <right-router>FRA-CORE-1</right-router>
    <right-interface>ethernet1-1</right-interface>
  </backbone-link>
  ...
</netinfra>  
```

The `<router>` container defines the router's name and its role in the network
topology (`core` / `edge`).

The `<backbone-link>` container defines the necessary endpoint paramaters to
configure a link between two routers.



#### L3VPN Service Configuration `<ietf-l3vpn-svc>`

The configuration for the L3VPN services itself contains two top-level
containers as well. These are defined in the IETF's L3VPN Service YANG model.
The first, `<vpn-services>`, defines the customer's VPN and the second,
`<sites>`, is a list of connection points which configure the edge router's
links to customer's sites, as follows:

```xml
<l3vpn-svc xmlns="urn:ietf:params:xml:ns:yang:ietf-l3vpn-svc">
  <vpn-services>
    <vpn-service>
      <vpn-id>acme-65501</vpn-id>
      <customer-name>CUSTOMER-1</customer-name>
    </vpn-service>
  </vpn-services>
  <sites>
    <site>
      <site-id>SITE-1</site-id>
      <locations>
        <location>
          <location-id>MAIN</location-id>
        </location>
      </locations>
      <management>
        <type>customer-managed</type>
      </management>
      <site-network-accesses>
        <site-network-access>
          <site-network-access-id>SNA-1-1</site-network-access-id>
          <location-reference>MAIN</location-reference>
          <bearer>
            <bearer-reference>AMS-CORE-1,ethernet1-3.100</bearer-reference>
          </bearer>
          <ip-connection>
            <ipv4>
              <address-allocation-type>static-address</address-allocation-type>
              <addresses>
                <provider-address>10.201.1.1</provider-address>
                <customer-address>10.201.1.2</customer-address>
                <prefix-length>30</prefix-length>
              </addresses>
            </ipv4>
          </ip-connection>
          <service>
            <svc-input-bandwidth>1000000000</svc-input-bandwidth>
            <svc-output-bandwidth>1000000000</svc-output-bandwidth>
            <svc-mtu>9000</svc-mtu>
          </service>
          <routing-protocols>
            <routing-protocol>
              <type>bgp</type>
              <bgp>
                <autonomous-system>65501</autonomous-system>
                <address-family>ipv4</address-family>
              </bgp>
            </routing-protocol>
          </routing-protocols>
          <vpn-attachment>
            <vpn-id>acme-65501</vpn-id>
          </vpn-attachment>
        </site-network-access>
      </site-network-accesses>
    </site>
</l3vpn-svc>
```


### Configuration at Layer 1 - Intermediate 

In SORESPO, the next layer down is the *Intermediate* layer. At this layer,
the implemented YANG modules are less abstracted than at `layer0`. Additional
parameters are calculated by the service automation. The YANG modules for `layer1` are
located in `sorespo/gen/yang/inter`.

The `layer1` configuration can be retrieved with the following command:

```shell
make get-config1
```

This excerpt from the output shows the intermediate layer configuration for the
`AMS-CORE-1` router. The IPv4 and IPv6 addressing for the loopback interface
for the device are added. These have been calculated according to a pre-defined
set of addressing rules.

Additionally, there is configuration for the customer's `acme-65501` VPN which
has been defined in the layer0 `ietf-l3vpn-svc` configuration.

```xml
<netinfra xmlns="http://example.com/netinfra-inter">
  <router>
    <name>AMS-CORE-1</name>
    <id>1</id>
    <role>edge</role>
    <base-config>
      <asn>65001</asn>
      <ipv4-address>10.0.0.1</ipv4-address>
      <ipv6-address>2001:db8:0:0::1</ipv6-address>
    </base-config>
    <l3vpn-vrf>
      <vpn-id>acme-65501</vpn-id>
      <ebgp-customer-address>10.201.1.2</ebgp-customer-address>
    </l3vpn-vrf>
  </router>
```

At the Intermediate layer, we also introduce a new container for configuring
iBGP between the core routers. As the configuration for this is entirely
deterministic, we don't need to expose it at `layer0`. All of the iBGP
configuration is created through SORESPO's automation, derived from the CFS
intent. The logic is simple, all core routers will form an iBGP full-mesh.

*Note*: it would be trivial to add route-reflectors, suitable for larger networks

The Intermediate layer calculates the IPv4 addresses used for each
of the peering routers and configures authentication.

```xml
<netinfra xmlns="http://example.com/netinfra-inter">
  ...
  <ibgp-fullmesh>
    <asn>65001</asn>
    <authentication-key>ibgp-authentication-key</authentication-key>
    <router>
      <name>AMS-CORE-1</name>
      <ipv4-address>10.0.0.1</ipv4-address>
    </router>
    <router>
      <name>FRA-CORE-1</name>
      <ipv4-address>10.0.0.2</ipv4-address>
    </router>
    <router>
      <name>STO-CORE-1</name>
      <ipv4-address>10.0.0.3</ipv4-address>
    </router>
  </ibgp-fullmesh>
  ...
<netinfra>
```

At the Intermediate layer, the L3VPN service configuration is re-structured as
follows:

```xml
<l3vpns xmlns="http://example.com/l3vpn-inter">
  <l3vpn>
    <name>acme-65501</name>
    <description>Customer VPN for CUSTOMER-1</description>
    <endpoint>
      <device>AMS-CORE-1</device>
      <interface>ethernet1-3.100</interface>
      <site>SITE-1</site>
      <site-network-access>SNA-1-1</site-network-access>
      <provider-ipv4-address>10.201.1.1</provider-ipv4-address>
      <customer-ipv4-address>10.201.1.2</customer-ipv4-address>
      <ipv4-prefix-length>30</ipv4-prefix-length>
      <bgp>
        <as-number>65501</as-number>
      </bgp>
    </endpoint>
    ...
</l3vpn>
```



### Configuration at Layer 2 - Resource Facing Service (RFS)

`layer2` is the Resource Facing Service (RFS) layer. Once again, configuration
at this layer is more explicit and concrete, with more parameters being 
filled-in by the automation. The main role of the RFS layer is to provide a 
stable vendor-agnostic abstraction to the upper layers. This means that new 
device type's YANG models and versions, or other device management protocol
integrations can be added without needing to make any changes to the
Intermediate or CFS layers above. All RFS transforms are written per device,
that is, a single RFS transform only writes to a single device. This enables
RFS transforms to be re-run in order to react to changes on the device.

The YANG modules for `layer2` are located in `sorespo/gen/yang/rfs`.

At this layer, there is an instance of `<device>` container per managed device
and a corresponding `<rfs>` container defining the devices SORESPO is
managing and the RFS services that SORESPO defines.

Let's retrieve the configuration for `layer2`:

```shell
make get-config2
```

Which gives the following output:
```xml
<rfs>
  <name>AMS-CORE-1</name>
  <base-config>
    <name>AMS-CORE-1</name>
    <ipv4-address>10.0.0.1</ipv4-address>
    <ipv6-address>2001:db8:0:0::1</ipv6-address>
    <asn>65001</asn>
    <ibgp-authentication-key>ibgp-authentication-key</ibgp-authentication-key>
  </base-config>
  <backbone-interface>
    <name>ethernet1-1</name>
    <ipv4-address>10.0.7.1</ipv4-address>
    <remote>
      <device>FRA-CORE-1</device>
      <interface>ethernet1-1</interface>
    </remote>
  </backbone-interface>
  <backbone-interface>
    <name>ethernet1-2</name>
    <ipv4-address>10.0.20.1</ipv4-address>
    <remote>
      <device>STO-CORE-1</device>
      <interface>ethernet1-1</interface>
    </remote>
  </backbone-interface>
  <ibgp-neighbor>
    <address>10.0.0.2</address>
    <asn>65001</asn>
    <description>FRA-CORE-1</description>
  </ibgp-neighbor>
  <ibgp-neighbor>
    <address>10.0.0.3</address>
    <asn>65001</asn>
    <description>STO-CORE-1</description>
  </ibgp-neighbor>
  <ibgp-neighbor>
    <address>10.0.0.4</address>
    <asn>65001</asn>
    <description>LJU-CORE-1</description>
  </ibgp-neighbor>
  <vrf>
    <name>acme-65501</name>
    <description>Customer VPN for CUSTOMER-1</description>
    <id>65501</id>
    <router-id>1</router-id>
    <asn>65001</asn>
  </vrf>
  <vrf-interface>
    <name>ethernet1-3.100</name>
    <description>Customer VPN access SITE-1 [SNA-1-1] in VPN acme-65501</description>
    <vrf>acme-65501</vrf>
    <ipv4-address>10.201.1.1</ipv4-address>
    <ipv4-prefix-length>30</ipv4-prefix-length>
  </vrf-interface>
  <ebgp-customer>
    <vrf>acme-65501</vrf>
    <address>10.201.1.2</address>
    <peer-asn>65501</peer-asn>
    <description>Customer eBGP SITE-1 [SNA-1-1] in VPN acme-65501 to 10.201.1.2</description>
    <authentication-key>acme-65501</authentication-key>
    <local-asn>65001</local-asn>
  </ebgp-customer>
</rfs>
```


#### Configuration at Layer 3 - The Device Layer

At this layer, we have the vendor proprietary device YANG models. The YANG
modules are organized in directories by device and software version:

* For Cisco IOS-XR: `sorespo/gen/yang/CiscoIosXr_24_1_ncs55a1`
* For Jupiper JUNOS: `JuniperCRPD_23_4R1_9`
* For Nokia SR-Linux: `NokiaSRLinux_25_3_2`

```
make get-config3
```

This returns several hundred lines of XML defining the full configuration of
each of the core router devices. We can see from the XML namespaces
( `xmlns="urn:nokia.com:srlinux:`) that these are the vendor models.


## Adding a new Core Router to the Topology

In order to add a new router to the network, including provisioning the
backbone links and iBGP peering, all we need to do is send in the
configuration for that router. The configuration is defined in
`/workspaces/sorespo/test/quicklab-srl/netinfra-add-lju.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<data>
    <netinfra xmlns="http://example.com/netinfra">
       <router>
            <name>LJU-CORE-1</name>
            <id>4</id>
            <role>core</role>
            <asn>65001</asn>
       </router>
       <backbone-link>
            <left-router>FRA-CORE-1</left-router>
            <left-interface>ethernet-1/3</left-interface>
            <right-router>LJU-CORE-1</right-router>
            <right-interface>ethernet-1/1</right-interface>
        </backbone-link>
        <backbone-link>
            <left-router>STO-CORE-1</left-router>
            <left-interface>ethernet-1/3</left-interface>
            <right-router>LJU-CORE-1</right-router>
            <right-interface>ethernet-1/2</right-interface>
        </backbone-link>
    </netinfra>
</data>
```

We send this configuration to SORESPO in the same way as we did above:
```shell
make send-config FILE="tutorial-add-lju.xml"
```

The topology now has four core routers. We can check this by logging in to the
new router:
```shell
make cli-lju-core-1
```

And running the following command:
```shell
/ show network-instance default protocols bgp neighbor
```

The resulting output shows that iBGP sessions with the other 3 core routers
have been established:
```
A:root@LJU-CORE-1# / show network-instance default protocols bgp neighbor
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
BGP neighbor summary for network-instance "default"
Flags: S static, D dynamic, L discovered by LLDP, B BFD enabled, - disabled, * slow
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
+--------------------+-----------------------------+--------------------+-------+-----------+----------------+----------------+--------------+-----------------------------+
|      Net-Inst      |            Peer             |       Group        | Flags |  Peer-AS  |     State      |     Uptime     |   AFI/SAFI   |       [Rx/Active/Tx]        |
+====================+=============================+====================+=======+===========+================+================+==============+=============================+
| default            | 10.0.0.1                    | IPV4-IBGP          | S     | 65001     | established    | 0d:0h:0m:46s   | evpn         | [0/0/0]                     |
|                    |                             |                    |       |           |                |                | ipv4-unicast | [0/0/0]                     |
| default            | 10.0.0.2                    | IPV4-IBGP          | S     | 65001     | established    | 0d:0h:0m:47s   | evpn         | [0/0/0]                     |
|                    |                             |                    |       |           |                |                | ipv4-unicast | [0/0/0]                     |
| default            | 10.0.0.3                    | IPV4-IBGP          | S     | 65001     | established    | 0d:0h:0m:47s   | evpn         | [0/0/0]                     |
|                    |                             |                    |       |           |                |                | ipv4-unicast | [0/0/0]                     |
+--------------------+-----------------------------+--------------------+-------+-----------+----------------+----------------+--------------+-----------------------------+
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
Summary:
3 configured neighbors, 3 configured sessions are established, 0 disabled peers
0 dynamic peers
```

Not only did we configure the new LJU-CORE-1 router but the necessary
configuration, iBGP neighbors, on all the other routers was automatically
added as per the updated intent (4 routers).

Finally, let's connect a customer site to the new router:

```shell
make send-config FILE="tutorial-add-cust-4.xml"
```

The resulting topology is as follows:

```
+-------------------+                                                                     +-------------------+   
|    cust-1-frr     |                                                                     |    cust-3-frr     |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|    (FRRouting)    |                                                                     |    (FRRouting)    |   
+----+--------------+                                                                     +--+----------------+   
     |eth1                                                                                   |eth1       
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |ethernet1/3.100                                                    |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |ethernet1/2               |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Nokia SR Linux) |               ethernet1/1|  (Nokia SR Linux) |ethernet1/4.100                
                      +--+----------------+                          +--+--------------+-+                        
                         |ethernet1/1                                   |ethernet1/2   |ethernet1/3                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                                              |              |                          
                         |                            +-----------------+              |                          
                         |                            |                                |                          
                         |                            |                                |                          
                         |                            |                                |                          
                         |                            |                                |                          
                         |ethernet1/1                 |                     ethernet1/2|                          
                      +--+----------------+ethernet1/2|              +-----------------+-+                        
                      |    fra-core-1     +-----------+              |    lju-core-1     |                        
                      |     10.0.0.2      |ethernet1/3               |     10.0.0.4      |                        
                      |  (Nokia SR Linux) +--------------------------+  (Nokia SR Linux) |                        
                      +---+---------------+               ethernet1/1+--------+----------+                        
                          |ethernet1/4.100                                    |ethernet1/3.100                           
                          |                                                   |                                   
 +-------------------+    |                                                   |              +-------------------+
 |    cust-2-frr     |    |                                                   |              |    cust-4-frr     |
 |    10.200.1.2     +----+                                                   |          eth1|    10.200.1.4     |
 |    (FRRouting)    |eth1                                                    +--------------+    (FRRouting)    |
 +-------------------+                                                                       +-------------------+
```

And finally, we can test the connectivity between all of the customer's
routers with the following command:
```shell
make test-ping
```
*NOTE*: It may take up to a minute for the customer and provider routers to establish a BGP session and exchange routes.

## What's Next
Now that you are familiar with running SORESPO and interacting with it,
continue by learning how to make [changes to the automation code](develop-on-codespaces.md).
