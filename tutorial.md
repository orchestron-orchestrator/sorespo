Orchestron and SORESPO

This lab tutorial demonstrates the functionality and capablities of the Orchestron automation platform. To do this, we need a network and services to automate. This is where the SOmewhat REalistic Service Provider Ooohh (SORESPO) comes in. SORESPO is the name given to the service automation for IP core network configuration offering Layer 3 VPN services. The customer facing service model (CFS) is an implmentation of the IETF's 'YANG Model for L3VPN Service Delivery' defined in RFC8299.

The lab implementation used for this tutorial uses ContainerLab and virtual routers running (freely downloadable) Nokia SR-Linux. The goal here is to provide a self-contained virtualised tutorial to intoduce Orchestron and SORESPO which can be downloaded and run without the need for any additional components or software licences. The topology uses BGP EVPN for the signalling protocol with VXLAN for the data plane, as these features do not require licenses.

The lab topology and router configuration was heavily inspired by https://learn.srlinux.dev/tutorials/l3evpn/rt5-only/

SORESPO's service automation also contains RFS implementations and device YANG integrations for Juniper JUNOS and Cisco IOS-XR based devices. As virtual Juniper cRPD and Cisco XRv images are not freely available without an active vendor support contract, they cannot be supplied as part of this tutorial. If you have access to cRPD/XRv virtual images, or physical router hardware running JUNOS/IOS-XR, then the lab topology configuration can easily be replaced with these.

If you are interested in using Orchestron for automating core networks and L3VPN service provisioning SORESPO is intended

Finally, SORESPO's is being used here to demonstate some of the service functionality of the Orchestron plaform. L3VPN was chosen as a good service for this as it is a common, well understood and overall useful service-provider use-case. But the Orchestron platform is capable of implementing almost any automation use-case for any domain. Over time, ewe expect that the Orchestron project will be extended with service automation code for many additional use-cases. The goal here is to make Orchestron as useful out-of-the-box to make service automation as simple as possible.


Getting Started

First, if you haven't already, clone the project:

```
git clone https://github.com/orchestron-orchestrator/sorespo.git
cd sorespo
```

Change to the `srl` branch which will be used for the Nokia SR-Linux lab tutorial:

```
git switch srl
```


Operating the Tutorial

The lab environment uses Makefiles to simplify perform a wide range of functions for the lab, including building, running and configuring the environment, and the execution of some common query and configuration tasks with Orchestron.

First, build the neces

```
make build
```
Then, start up the necessary containers:
```
make -C test/quicklab-srl start
# [ a lot of continerlab output ]
```

Note: The lab can be shut down with `make -C test/quicklab-srl stop`

Copy the Orchestron binary to the container:
```
make -C test/quicklab-srl copy-otron-binary
# [ a lot of continerlab output ]
```

Run the Orchestron process:
```
make -C test/quicklab-srl run
# [ a lot of continerlab output ]
```

The Orchestron process is now running in this shell window, you will need to open a second shell to enter the commands to continue with this tutorial.

At this stage, we have the lab topology with running router containers. The only configuration they have at this stage are the management access and credentials so that Orchestron can send configuration. Otherwise, they are unconfigures. The Orcheston application is also running, but does not have any network or service intent configuration loaded.

To configure the underlying routers and links, we load in the top-level XML configuration for the starting core network topology. This file describes the network infrastructure intent, which is all that is needed to configure the core routers, backbone links and routing protocols so that it is ready for service configuration.

```
FILE="netinfrastart.xml" make -C test/quicklab-srl send-config
```

Next we load in the top-level XML configuration for the customer's L3VPN service. This file describes the intent, which is all that is needed to configured a customer's VPN across all three core routers, and the access links to the customer's sites.

```
FILE="l3vpn-svcstart.xml" make -C test/quicklab-srl send-config 
```


The resulting lab has three core SR-Linux routers, each with an attached customer edge running FRR. This diagram shows the topology:

```
+-------------------+                                                                     +-------------------+   
|    cust-1-frr     |                                                                     |    cust-3-frr     |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|    (Linux FRR)    |                                                                     |    (Linux FRR)    |   
+----+--------------+                                                                     +--+----------------+   
     |eth1                                                                                   |eth1       
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |ethernet1/3.100                                                    |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |ethernet1/2               |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Nokia SR-Linux) |               ethernet1/1|  (Nokia SR-Linux) |ethernet1/4.100                
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
                      |  (Nokia SR-Linux) +             
                      +---+---------------+                   
                          |ethernet1/4.100        
                          |
 +-------------------+    |
 |    cust-2-frr     |    | 
 |    10.200.1.2     +----+ 
 |    (Linux FRR)    |eth1 
 +-------------------+                                                               
```

To test the above topology, you can log dirctly into the core routers and run a few commands. For reference, more detail on the SR-Linux CLI can be found at: https://documentation.nokia.com/srlinux/24-3/title/basics.html

```
make -C test/quicklab-srl cli-ams-core-1 # This logs in to the ams-core-1 cli so we
/ 
show network-instance default protocols bgp neighbor
ping network-instance default 10.0.0.2
```

These commands show that the loopback addresses are reachable and iBGP has been established between of the 3 core routers. Use `ctrl-c` to stop the `ping` command and `quit` to log out of the router.

In the next section, we'll look at the contents of the two XML configuaration files we just loaded, and see how this is  SOPESPO uses layered automation to 




Service Automation Layering In SORESPO

SORESPO implments highly abstracted device and service configuration through layers of automation. While SORESPO is implemented using four discrete layers, Orchestron does not place any limitations on the number of layers that can be implemented - as few or many as necessary can be used.

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


The Orchestron container implements a RESTCONF interface Northbound interface. For many common queries and tasks, `make` targets are implemented to send the relevant RESTCONF requests. 

Configuration at Layer 0 - Cuustomer Facing Service (CFS)

The Customer Facing Service (top-level) YANG model implemented by SORESPO and defines it's northbound interface for the users, or for BSS/OSS platforms. The YANG modules for layer0 are located in `sorespo/gen/yang/cfs`.

We can retrieve the top-level (CFS) configuration from Orchestron (level 0) using the following command:

```
make -C test/quicklab-srl get-config0
```

NB: XML is used for all of the examples throughout this tutorial, but if you prefer JSON format, use:

```
make -C test/quicklab-srl get-config-json0
```

The resulting output has two top-level containers, `<netinfra>` (the first configuration file we loaded above), which describes the configuration of the network devices and topology, and `<l3vpn-svc>` (the second loaded configuration file) which is an implementation of `ietf-l3vpn-svc.yang` defined in RFC8299. This is used to define the VPNs, customer attachment points and other paramteres necessary for provisioning customer L3VPN services. 

```
<netinfra xmlns="http://example.com/netinfra">
...
</netinfra>
<l3vpn-svc xmlns="urn:ietf:params:xml:ns:yang:ietf-l3vpn-svc">
...
</l3vpn-svc>
```

Core Network Topology Configuration <netinfra>

`<netinfra>` holds the router and backbone link configuration. At level0, this is highly abstracted with only the essential paramaters being exposed. The other automation layers implement the logic necessary to create the device level configuration (described by vendor supplied YANG modules).

```
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

The `<router>` container defines the router's name and its role in the network topology (core or edge).

The `<backbone-link>` container defines the necessary endpoint paramaters to configure a link between two routers.


L3VPN Service Configuration <ietf-l3vpn-svc>

The configuraiton for two of the top-level containers defined in the IETF's L3VPN Service YANG model, the first `<vpn-services>` defines the customer's VPN and the second `<sites>` is a list of connection points which configure the edge router's links to customer's sites. 

```
  <vpn-services>
    <vpn-service>
      <vpn-id>acme-65501</vpn-id>
      <customer-name>CUSTOMER-1</customer-name>
    </vpn-service>
  </vpn-services>
```

```
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
```


Configuration at Layer1 - Intermediate 

In SORESPO, the next layer down is the 'Intermediate' layer. At this layer, the implemented YANG modules are less abstracted than at layer0. Additional parameters are calculated by the service automation. 

The layer1 configuration can be retrieved with the following command:

```
make -C test/quicklab-srl get-config1
```
This excerpt from the output shows the intermediate layer configuration for the AMS-CORE-1 router. The IPv4 and IPv6 addressing for the loopback interface for the device are added. These have been calculated according to a pre-defined set of addressing rules.

Additionally, there is configuration for the customer's `acme-65501` VPN which has been defined in the layer0 `ietf-l3vpn-svc` configuration.

```
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

At the Intermediate layer, we also introduce a new container for configuring iBGP between the core routers. As the configuration for this is entirely deterministic, we don't need to expose it at Layer0. All of the necessary configuration is created through SORESPO's automation.

As there are no BGP route reflectors in the topology, we are building an iBGP full-mesh. At this layer, we define the BGP authentication and calculate the IPv4 address for each of the peering routers.

```
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
      <name>LJU-CORE-1</name>
      <ipv4-address>10.0.0.4</ipv4-address>
    </router>
    <router>
      <name>STO-CORE-1</name>
      <ipv4-address>10.0.0.3</ipv4-address>
    </router>
  </ibgp-fullmesh>
  ...
<netinfra>
```

At the Intermediate layer, the L3VPN service configuration is re-structured as follows:

```
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



Configuration at Layer2 - Resource Facing Service (RFS)

Layer2 is the Resource Facing Service (RFS) layer. Once again, configuration at this layer is more explict, with more parameters being generated by the automation. The main role of the RFS layer is to provide a stable vendor-agnostic abstraction to the upper layers. This means that new device types YANG models and versions, or other device management protocol integrations can be added without needing to make any changes to the Intermediate or CFS layers above.

At this stage, there is an instance of `<device>` container per managed device and a corresponding `<rfs>` container defining the 

```
make -C test/quicklab-srl get-config2
```


```
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

Configuration at Layer 3 - The Device Layer

At this layer, we have the vendor's device specific YANG models. 

```
make -C test/quicklab-srl get-config3
```

This returns several hundred lines of XML defining the full configuration of each of the core router devices. We can see from the XML namespaces ( `xmlns="urn:nokia.com:srlinux:`) that these are the vendor's models.

Adding a new Site to the Topology

In order to add a new router to the network, including provisioning the backbone links and iBGP peering, all we need to do is send in the configuration for that router. The configuration is defined in `test/quicklab-srl/netinfra-add-lju.xml`:

```
$ cat test/quicklab-srl/netinfra-add-lju.xml`
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

We send this configuration, in the same way as above:

```
FILE="netinfra-add-lju.xml" make -C test/quicklab-srl send-config
```

The topology now has four core router. We can check this by logging in to the new router:
```
make -C test/quicklab-srl cli-lju-core-1
```
And running the following command:
```
/ show network-instance default protocols bgp neighbor

```
The resulting output shows that iBGP sessions with the other 3 core routers have been established:
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

Finally, let's connect a customer site to the new router. The configuration for this is in `test/quicklab-srl/l3vpn-svc-add-cust4.xml':

```
FILE="l3vpn-svc-add-cust4.xml" make -C test/quicklab-srl send-config
```

The resulting topology is as follows:

```
+-------------------+                                                                     +-------------------+   
|    cust-1-frr     |                                                                     |    cust-3-frr     |   
|    10.200.1.1     |                                                                     |    10.200.1.3     |   
|    (Linux FRR)    |                                                                     |    (Linux FRR)    |   
+----+--------------+                                                                     +--+----------------+   
     |eth1                                                                                   |eth1       
     |                                                                                       |                    
     +-------------------+                                                                   |                    
                         |                                                                   |                    
                         |ethernet1/3.100                                                    |                    
                      +--+----------------+                          +-------------------+   |                    
                      |    ams-core-1     |ethernet1/2               |    sto-core-1     |   |                    
                      |     10.0.0.1      +--------------------------+     10.0.0.3      +---+                    
                      |  (Nokia SR-Linux) |               ethernet1/1|  (Nokia SR-Linux) |ethernet1/4.100                
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
                      |  (Nokia SR-Linux) +--------------------------+  (Nokia SR-Linux) |                        
                      +---+---------------+               ethernet1/1+--------+----------+                        
                          |ethernet1/4.100                                    |ethernet1/3.100                           
                          |                                                   |                                   
 +-------------------+    |                                                   |              +-------------------+
 |    cust-2-frr     |    |                                                   |              |    cust-4-frr     |
 |    10.200.1.2     +----+                                                   |          eth1|    10.200.1.4     |
 |    (Linux FRR)    |eth1                                                    +--------------+    (Linux FRR)    |
 +-------------------+                                                                       +-------------------+
```

And finally, we can test the connectivity between all of the customer's routers with the following command:

```
make -C test/quicklab-srl test-ping
```
NB - THIS BIT DOESN'T WORK
