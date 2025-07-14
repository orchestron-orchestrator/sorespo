# Developing SORESPO on GitHub Codespaces

## Introduction

This tutorial will guide you through making your first changes to the
SORESPO automation code and building the application. If you are not yet
familiar with the basic steps involved in running and interacting with
Orchestron, you might want to start out with the tutorial on
[running SORESPO](run-on-codespaces.md) first.

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
access to VS Code running in Dev Container with all the tools and source code
available in your browser.

## Starting the SORESPO Network
*NOTE*: If you already completed the tutorial on [running SORESPO](run-on-codespaces.md),
you can skip ahead to the [next step](develop-on-codespaces.md#modifying-the-sorespo-application)!

Go into the `/workspaces/sorespo/test/quicklab-srl` directory and start the
development tutorial:
```shell
cd sorespo/test/quicklab-srl
make dev-tutorial
...
... # Start a local build of Orchestron/SORESPO, this may take several minutes ...
...
... # Containerlab starts the SR Linux lab, this may take a few minutes ...
...
Orchestron/sorespo running..
...
All config files applied
...
```

You now have a running lab topology with fully configured containerized
routers. The current state of the lab is identical to the final step in the
[tutorial on running SORESPO](run-on-codespaces.md).

----

*Notes*:
* The Orchestron process runs interactively in this Terminal window. When you
  kill it with *Ctrl+C*, Orchestron itself will stop, but the lab and all the
  routers will continue to run.
* You will need to **open a second Terminal** to enter further commands and
  continue with the tutorial. Click the *+* button in the top right of the VS
  Code Terminal window to do so.
* The lab can be shut down with `make stop`.

## Modifying the SORESPO application

Changing the application typically involves modifying the RFS transforms to
modify the output configuration and optionally modifying the models.

Let's first retrieve the current configuration on the `ams-core-1` router, we
will do so by connecting to the router directly over NETCONF.
In a new Terminal navigate to the `/workspaces/sorespo/test/quicklab-srl`
directory and get the configuration:
```shell
cd test/quicklab-srl
make get-dev-config-ams-core-1 | sed -n '/<interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">/,/<\/interface>/p'
```
*NOTE*: The `sed` command filters the output down to the section we are
interested in for the purpose of this tutorial.

Part of the output is the VRF interface:
```xml
...
<interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>ethernet-1/3</name>
    <admin-state>enable</admin-state>
    <subinterface>
        <index>100</index>
        <description>Customer VPN access SITE-1 [SNA-1-1] in VPN acme-65501</description>
        <admin-state>enable</admin-state>
        <ipv4>
            <admin-state>enable</admin-state>
            <address>
                <ip-prefix>10.201.1.1/30</ip-prefix>
            </address>
        </ipv4>
    </subinterface>
</interface>
...
```

Notice how Orchestron filled in a handy interface description for the
subinterface, but there is no description on the main `ethernet-1/3`
interface. We will now modify the SORESPO code to add one in.

Open `sorespo/src/sorespo/rfs.act` in your favorite editor and find the
following section of the code:

```python
class VrfInterface(base.VrfInterface):
    def transform(self, i, di):
        ...
        elif "srl_nokia-system" in di.modules:
            print("RFS /rfs{{{di.name}}}/vrf-interface transform running {i.name} for Nokia SRLinux", err=True)
            dev = srl25.root()

            # Create the main interface
            intf = dev.interface.create(main_intf)
            intf.admin_state = "enable"
```

Now, modify `sorespo/src/sorespo/rfs.act` to set an interface description on VRF interfaces:
```python
class VrfInterface(base.VrfInterface):
    def transform(self, i, di):
        ...
        elif "srl_nokia-system" in di.modules:
            print("RFS /rfs{{{di.name}}}/vrf-interface transform running {i.name} for Nokia SRLinux", err=True)
            dev = srl25.root()

            # Create the main interface
            intf = dev.interface.create(main_intf)
            intf.admin_state = "enable"
            intf.description = "VRF Interface for customer connections"
```

After you have saved the file to disk, you can re-build the Orchestron binary
to incorporate the change. Press *Ctrl+C* in the terminal window where
Orchestron is running.

Then in the same terminal window trigger a build:
```shell
make -C ../../ build
```
*NOTE*: With `-C ../../` we instruct `make` to run the `build` recipe two
levels up from the current directory, saving us the hassle of moving around in
the directory structure.

After the build has completed you can copy your updated binary into the lab and
re-run/configure Orchestron:
```shell
make copy run-and-configure
```

Wait a few seconds for Orchestron to apply your changes to the routers and
repeat the steps above to validate your change was successful.
```shell
make get-dev-config-ams-core-1 | sed -n '/<interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">/,/<\/interface>/p'
```

We can now see the interface description has been applied to each of the VRF
interfaces on our routers:
```xml
...
<interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>ethernet-1/3</name>
    <admin-state>enable</admin-state>
    <description>VRF Interface for customer connections</description>
    <subinterface>
        <index>100</index>
        <description>Customer VPN access SITE-1 [SNA-1-1] in VPN acme-65501</description>
        <admin-state>enable</admin-state>
        <ipv4>
            <admin-state>enable</admin-state>
            <address>
                <ip-prefix>10.201.1.1/30</ip-prefix>
            </address>
        </ipv4>
    </subinterface>
</interface>
...
```

### Modifying the SORESPO YANG models

Besides modifying transform code, you may also want to modify the YANG models
themselves to be able to pass different parameters from layer to layer.

Retrieve the current input to the RFS layer, i.e. `layer2`:
```shell
make get-config2 | sed -n '/<vrf-interface>/,/<\/vrf-interface>/p'
```

Part of the output will be a configuration instance for the `vrf-interface` on `ams-core-1`:
```xml
...
  <vrf-interface>
    <name>ethernet-1/3.100</name>
    <description>Customer VPN access SITE-1 [SNA-1-1] in VPN acme-65501</description>
    <vrf>acme-65501</vrf>
    <ipv4-address>10.201.1.1</ipv4-address>
    <ipv4-prefix-length>30</ipv4-prefix-length>
  </vrf-interface>
</rfs>
...
```

This RFS instance at present does not have an input for MTU configuration. We
can also see this by reviewing the YANG model for this layer in
`sorespo/gen/yang/rfs/sorespo-rfs.yang`.

```yang
...
list vrf-interface {
    key "name";
    orchestron:rfs-transform sorespo.rfs.VrfInterface;
    leaf name {
        type string;
    }
    leaf description {
        type string;
    }
    leaf vrf {
        type string;
        description
            "VRF name";
        mandatory true;
    }
    leaf ipv4-address {
        type inet:ipv4-address;
    }
    leaf ipv4-prefix-length {
        type uint8 {
            range "1..31";
        }
        default "30";
    }
}
```

Modify the YANG module to add in the `mtu` leaf:
```yang
...
list vrf-interface {
    key "name";
    orchestron:rfs-transform sorespo.rfs.VrfInterface;
    leaf name {
        type string;
    }
    leaf description {
        type string;
    }
    leaf vrf {
        type string;
        description
            "VRF name";
        mandatory true;
    }
    leaf ipv4-address {
        type inet:ipv4-address;
    }
    leaf ipv4-prefix-length {
        type uint8 {
            range "1..31";
        }
        default "30";
    }
    leaf mtu {
        type uint16 {
            range "..9000";
        }
    }
}
```

Open `sorespo/src/sorespo/inter.act` in your favorite editor and find the
following section of the code:

```python
...
class L3Vpn(base.L3Vpn):
    def transform(self, i):
...
            vi = rfs.vrf_interface.create(ep.interface)
            vi.description = "Customer VPN access %s [%s] in VPN %s" % (ep.site, ep.site_network_access, i.name)
            vi.ipv4_address = ep.provider_ipv4_address
            vi.ipv4_prefix_length = ep.ipv4_prefix_length
            vi.vrf = i.name
```

Now, modify `sorespo/src/sorespo/inter.act` to set an MTU on VRF interfaces:
```python
...
class L3Vpn(base.L3Vpn):
    def transform(self, i):
...
            vi = rfs.vrf_interface.create(ep.interface)
            vi.description = "Customer VPN access %s [%s] in VPN %s" % (ep.site, ep.site_network_access, i.name)
            vi.ipv4_address = ep.provider_ipv4_address
            vi.ipv4_prefix_length = ep.ipv4_prefix_length
            vi.vrf = i.name
            vi.mtu = 1500
```


After you have saved the files to disk, you can re-build the Orchestron binary
to incorporate the change. Once again, press *Ctrl+C* in the terminal window
where Orchestron is running.

Then in the same terminal window first trigger a re-generation of the
Orchestron YANG framework:
```shell
make -C ../../ gen
```

Then in the same terminal window trigger a build:
```shell
make -C ../../ build
```

After the build has completed you can copy your updated binary into the lab and
re-run/configure Orchestron:
```shell
make copy run-and-configure
```

Wait a few seconds for Orchestron to start and retrieve the configuration for
`layer2`.
```shell
make get-config2
```

Part of the output will be a configuration instance for the `vrf-interface` on
`ams-core-1`:
```xml
...
  <vrf-interface>
    <name>ethernet-1/3.100</name>
    <description>Customer VPN access SITE-1 [SNA-1-1] in VPN acme-65501</description>
    <vrf>acme-65501</vrf>
    <ipv4-address>10.201.1.1</ipv4-address>
    <ipv4-prefix-length>30</ipv4-prefix-length>
    <mtu>1500</mtu>
  </vrf-interface>
...
```

*Note*: In reality, You wouldn't likely hard-code the MTU in the Intermediate
Transform. We would expect the MTU to be passed down from higher layers, e.g.
from the CFS intent all the way down to the device configuration. But the
development process from here on out is always the same.

## What's Next
Now that you are familiar with running and developing for Orchestron, continue
to explore the [other labs](../../test/README.md) we have available, including
more router vendors etc..
