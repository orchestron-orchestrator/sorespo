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

Generate a sparse geographic ROADM topology with edge router attachments and
non-optimal optical routes:

```bash
make randomize ROUTERS=4 ROADMS=6 BACKBONE_LINKS=4
```

Use `SEED=<integer>` to reproduce a topology. `MIN_SPAN_KM` and `MAX_SPAN_KM`
default to 200 and 500. ROADMs receive latitude and longitude coordinates, and
fiber distance and latency are calculated from those coordinates. The physical
network uses a minimum spanning tree plus short, non-crossing redundancy links;
it is never a complete mesh. Routers attach to ROADMs on the geographic hull.
Each router consistently uses that same edge ROADM as the first or last node of
every optical path, allowing the dashboard to render both devices as one site.
Where the physical graph permits it, routes deliberately take a randomized
loop-free detour through more ROADMs than the distance-optimal path. They fall
back to the optimal path only when no such simple detour exists.
Router counts are limited to 2-26, at least three ROADMs are required, and at
least `ROUTERS - 1` backbone links are required so every router remains
reachable. The generator reports when the current addressing or port limits
cannot represent the requested counts. Randomizing destroys any currently
running instance of this lab before replacing its topology files. Afterward,
run `make start`, `make copy`, and `make run-and-configure` as usual.

In another terminal, verify end-to-end connectivity through the OTN path:

```bash
make ping
```

To test every router pair in both directions from their loopback addresses and
report the minimum, average, and maximum latency:

```bash
make test-ping
```