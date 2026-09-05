# Quicklab OTN VLAN simulation

This lab connects two Nokia SR Linux routers through three Nokia SR Linux
ROADMs. The router-facing links are untagged, while VLAN 100 is carried between
ROADMs through a shared MAC-VRF. The two optical spans emulate 20 km and 50 km
of fiber with 100 us and 250 us of one-way latency, respectively.

```text
ams-core-1      roadm-1         roadm-2         roadm-3      sto-core-1
 e1-2 --- e1-1  e1-2 --- e1-1  e1-2 --- e1-1  e1-2 --- e1-1
10.0.20.1/30                                               10.0.20.2/30
```

Build and run the lab from this directory:

```bash
make start
make -C ../.. build-linux-aarch64
make copy
make run-and-configure
```

`make start` applies the optical-link latency values from `netinfra.xml` to both
directions of each ROADM-to-ROADM link using Containerlab netem. Reapply them to
an already-running topology with `make apply-optical-latency`.

In another terminal, verify end-to-end connectivity through the OTN path:

```bash
make ping
```

To test every router pair in both directions from their loopback addresses and
report the minimum, average, and maximum latency:

```bash
make test-ping
```