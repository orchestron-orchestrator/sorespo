TESTENV=sorespo-quicklab-xrd

ROUTERS_XR=sto-core-1 lju-core-1 ams-core-1 fra-core-1
ROUTERS_FRR=cust-1 cust-2 cust-3 cust-4

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk

# --- BGP session failure injection --------------------------------------------
# Drop 100% of packets on a PE's customer-facing port with netem. The link stays
# operationally UP, but BGP keepalives are lost, so the eBGP PE<->CE session drops
# after the negotiated hold time. This drives the reactive BGP-neighbor telemetry
# to escalate (debug-active=true) on the affected neighbor.
# Default: ams-core-1's customer access port Gi0-0-0-2 (-> cust-1, eBGP neighbor
# 10.201.1.2 in VRF acme-65501). Gi0-0-0-N is the containerlab veth in the XRd
# container that maps to GigabitEthernet0/0/0/N.
BGP_IMPAIR_ROUTER ?= ams-core-1
BGP_IMPAIR_IF     ?= Gi0-0-0-2

.PHONY: bgp-impair
bgp-impair:
	@echo "Dropping 100% of packets on $(BGP_IMPAIR_ROUTER) $(BGP_IMPAIR_IF) (link stays up; eBGP session drops after hold)"
	docker exec $(TESTENV)-$(BGP_IMPAIR_ROUTER) tc qdisc add dev $(BGP_IMPAIR_IF) root netem loss 100%

.PHONY: bgp-restore
bgp-restore:
	@echo "Removing netem on $(BGP_IMPAIR_ROUTER) $(BGP_IMPAIR_IF)"
	docker exec $(TESTENV)-$(BGP_IMPAIR_ROUTER) tc qdisc del dev $(BGP_IMPAIR_IF) root || true
