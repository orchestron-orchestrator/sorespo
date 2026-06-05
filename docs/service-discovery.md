# Service Discovery

Service discovery turns device XML configuration snapshots into SORESPO service
data. The test inputs live under `test/sd`, and the discovery implementation
lives under `src/sorespo/discovery`.

## Adding Device XML

Put each device snapshot in:

```text
test/sd/<device-type>/<device-name>.xml
```

`<device-type>` must match a key in `sorespo.sysspec.SYSSPEC.device_types`, for
example:

```text
test/sd/CiscoIosXr_25_3_1/AMS-CORE-1.xml
test/sd/JuniperCRPD_24_4R1_9/LJU-CORE-1.xml
```

The file name without `.xml` becomes the device name. Keep names unique across
all device-type directories. The XML is parsed with the bundled schema for that
device type, so capture the device configuration as XML from NETCONF or another
schema-compatible source.

If the snapshot contains encrypted BGP authentication keys, add the possible
plaintext values to `_AUTHENTICATION_KEY_HINTS` in
`src/sorespo/test_discovery.act`.

## Test Flow

`src/sorespo/test_discovery.act` defines two service-discovery tests:

- `_test_sd_to_rfs` runs `rfs_discovery.discover_rfs(...)` and applies the
  result at layer 2 - rfs layer.
- `_test_sd_to_cfs` runs `cfs_discovery.discover(...)` and applies the result at
  layer 0 - cfs layer.

Both tests use `stratoweave.testing.ServiceDiscoveryTester`. The tester scans
`test/sd`, parses every `*.xml` file by device type, passes a
`dict[device-name, gdata.Node]` to the discovery function, and applies the
returned gdata through the normal TTT layer stack. The snapshot contains the
discovered layer data and a per-device round-trip diff against the regenerated
device config.

Run the tests with:

```shell
acton test
```

## Code Layout

`src/sorespo/discovery/rfs_discovery.act` is the device-normalization stage. It
detects the device type once per input device, extracts base config, backbone
interfaces, iBGP neighbors, VRFs, VRF interfaces, and eBGP customers, then writes
them into an RFS root. `discover_rfs_root(...)` returns the typed RFS tree;
`discover_rfs(...)` returns the same data as gdata for the test rig.

`src/sorespo/discovery/cfs_discovery.act` is the service-aggregation stage. It
calls `discover_rfs_root(...)`, iterates over `rfs_root.rfs`, creates CFS routers,
aggregates backbone links, builds L3VPN service entries, and writes global iBGP
settings.

When adding discovery support, keep device-specific reads inside the common RFS
discovery functions and branch on the device type there. CFS should consume the
normalized RFS data instead of reading device-specific config directly.
