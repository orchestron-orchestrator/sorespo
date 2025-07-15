# Running SORESPO on Linux

## Introduction

The SORESPO network is a combination of a number of (containerized) router labs
and the orchestration system to manage the entire lifecycle of the network.

You will need a Linux host with 4 CPU cores and 8 GB of RAM available to be
able to start the "Nokia SR Linux" lab used throughout this tutorial.
CPU virtualization (KVM extensions) is **NOT** required. The tutorial was
written and validated for Ubuntu / Debian but should work on any modern Linux
distribution.

## Preparing the Environment

* Install the following prerequisites:
  * [Docker Engine](https://docs.docker.com/engine/install/)
  * [Git](https://git-scm.com/downloads/linux)
* Install the  `vrf` kernel module, on Ubuntu or Debian this can be done with:
``` shell
sudo apt update
sudo apt install linux-modules-extra-$(uname -r)
```

## Starting the SORESPO Network

First, if you haven't already, clone the project:
```shell
git clone https://github.com/orchestron-orchestrator/sorespo.git
```

Then, go into the `sorespo/test/quicklab-srl` directory and start the tutorial:
```shell
cd sorespo/test/quicklab-srl
make tutorial
...
... # Containerlab starts the SR Linux lab, this may take a few minutes ...
...
Orchestron/sorespo running..
```

This will first start the entire SR Linux lab and finally run the SORESPO
process interactively in this shell window. You will need to
**open a second shell** to enter further commands and continue with the
tutorial.

*Note*: The lab can be shut down with `make stop`

At this stage, we have the lab topology with running containerized routers.
The only configuration they have is for the management access and credentials
so that SORESPO can connect and send configuration. Otherwise, they are
unconfigured. The Orcheston application is also running, but does not have any
network or service intent configuration loaded.

## Loading intent configuration into SORESPO

To configure the underlying routers and links, we load in the top-level XML
configuration for the starting core network topology. This file describes the
network infrastructure intent, which is all that is needed to configure the
core routers, backbone links and routing protocols that are ready forcustomer
service configuration.

In a new shell navigate to the `sorespo/test/quicklab-srl` directory and load
the intent:
```shell
cd sorespo/test/quicklab-srl
FILE="tutorial-netinfra.xml" make send-config
```

Next we load in the top-level XML configuration for the customer's L3VPN
service. This file describes the intent, which is all that is needed to
configure a customer's VPN across all three core routers, and the access links
to the customer's sites.

```shell
FILE="tutorial-l3vpn-svc.xml" make send-config 
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
/ ping network-instance default 10.0.0.2
```

These commands show that the loopback addresses are reachable and iBGP has been
established between the 3 core routers. Use *Ctrl+C* to stop the `ping` command
and `quit` to log out of the router.

*Note*: The [SR Linux Configuration Basics](https://documentation.nokia.com/srlinux/24-3/title/basics.html)
are a great introduction to the Nokia SR Linux CLI.

In the next section, we'll look at the contents of the two XML configuration
files we just loaded. And we'll review step-by-step how layered automation
enables SOPESPO to configure a complete Service Provider network from a
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


The SORESPO container implements a RESTCONF northbound interface.
For many common queries and tasks, `make` targets are implemented to send the
relevant RESTCONF requests. 


### Configuration at Layer 0 - Cuustomer Facing Service (CFS)

The Customer Facing Service (top-level) YANG model defines SORESPO's northbound
interface for users and/or BSS/OSS platforms. The YANG modules for `layer0` are
located in `sorespo/gen/yang/cfs`.

We can retrieve the top-level (CFS) configuration (level 0) from SORESPO
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
other paramteres necessary for provisioning customer L3VPN services. 

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
this is highly abstracted with only the essential paramaters being exposed.
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
topology (core or edge).

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


### Configuration at Layer1 - Intermediate 

In SORESPO, the next layer down is the *Intermediate* layer. At this layer,
the implemented YANG modules are less abstracted than at `layer0`. Additional
parameters are calculated by the service automation. 

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
deterministic, we don't need to expose it at `layer0`. All of the necessary
configuration is created through SORESPO's automation.

As there are no BGP route reflectors in the topology, we are building an iBGP
full-mesh. At this layer, we define the BGP authentication and calculate the
IPv4 address for each of the peering routers.

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



### Configuration at Layer2 - Resource Facing Service (RFS)

`layer2` is the Resource Facing Service (RFS) layer. Once again, configuration
at this layer is more explict, with more parameters being generated by the
automation. The main role of the RFS layer is to provide a stable
vendor-agnostic abstraction to the upper layers. This means that new device
type's YANG models and versions, or other device management protocol
integrations can be added without needing to make any changes to the
Intermediate or CFS layers above.

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

At this layer, we have the vendor's device specific YANG models. 

```
make get-config3
```

This returns several hundred lines of XML defining the full configuration of
each of the core router devices. We can see from the XML namespaces
( `xmlns="urn:nokia.com:srlinux:`) that these are the vendor's models.


## Adding a new Core Router to the Topology

In order to add a new router to the network, including provisioning the
backbone links and iBGP peering, all we need to do is send in the
configuration for that router. The configuration is defined in
`test/quicklab-srl/netinfra-add-lju.xml`:

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
FILE="tutorial-add-lju.xml" make send-config
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

Finally, let's connect a customer site to the new router:

```shell
FILE="tutorial-add-cust-4.xml" make send-config
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
continue by learning how to make [changes to the automation code](develop-on-linux.md).
