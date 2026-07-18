# IOS XR eBGP on-change demo

This lab runs one SoReSpo-managed IOS XRd 25.3.1 control-plane router and one
external XRd peer. The external router stands in for a network outside
SoReSpo's ownership: its interface and BGP neighbors are supplied entirely by
`xrd-b-startup.conf`, and it does not appear in `netinfra.xml`.

`/netinfra/peering-interface` configures XRd-A's external interface and its
`/24` addresses. Its primary and secondary address support lets several
independent sessions share one physical link. Each `/netinfra/ebgp-peer`
selects its own `local-address`; the demo uses `.1 -> .2` and `.3 -> .4`.
XRd-A's startup configuration deliberately contains neither the addresses nor
BGP, so the demo proves both resources are created from intended state.
SoReSpo monitors XRd-A's BGP operational state through the OpenConfig
network-instance tree with a YANG Push
`on-change sync-on-start` subscription transported over UDP-Notif. XR 25.3.1
accepts the native Cisco BGP tree for cadence-based telemetry, but only the
OpenConfig BGP state path emits event-driven session changes.
The transform also requests a 30-second periodic stream for the same leaf as
a bounded-staleness safety net if the final UDP transition is lost.

Build SoReSpo with the repository's sibling dependency checkouts and the Acton
compiler that supports dynamic `__get_attr__`, then start the lab from the
SoReSpo repository root:

```sh
export PATH="$HOME/dt/actonl1/dist/bin:$PATH"
acton build --release --dep stratoweave=../stratoweave
cd test/ietf-hackathon-xrd
make start wait copy run
```

In another terminal, inspect both service states and clear either session from
the external router. XRd-B attempts to re-establish it, so the useful
observation is the selected peer's on-change transition away from
`established` followed by the transition back:

```sh
make state
make session-clear CLEAR_PEER=10.0.48.1
make session-clear CLEAR_PEER=10.0.48.3
make state
```

The SoReSpo process logs the XR UDP-Notif subscription and any malformed,
lost, or out-of-sequence notifications. The subscription uses XR's management
interface as its source so the UDP datagrams are routable to SoReSpo.
`session-clear` sends the `Cisco-IOS-XR-ipv4-bgp-act` clear RPC directly to
the external XRd-B NETCONF endpoint. `CLEAR_PEER` is the managed-side address
used as the neighbor key on XRd-B. The RPC does not pass through SoReSpo or
StratoWeave's managed-device path. A MIDI application can keep the same kind
of external NETCONF connection open and map each key to one of these neighbor
addresses.

The event-driven sensor path is:

```text
openconfig-network-instance:network-instances/network-instance[name='DEFAULT']/protocols/protocol[name='default']/bgp/neighbors/neighbor[neighbor-address='<peer>']/state/session-state
```

The typed selector also carries the protocol `identifier=BGP` key. XR 25.3.1
rejects identityref predicates in configured YANG Push XPath filters, so the
XR dialect adapter omits only that predicate; the string and peer-address keys
remain on the wire and the decoded protocol identity is still checked as BGP.

Stop the process with Ctrl-C, then run `make stop` to remove the lab.
