TESTENV=sorespo-quicklab-srl

ROUTERS_SRL=sto-core-1 lju-core-1 ams-core-1 fra-core-1
ROUTERS_FRR=cust-1 cust-2 cust-3 cust-4

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk

# Each entry is "<router>:<srl-interface>". Mirrors netinfra.xml's
# backbone-link entries (10 endpoints = 5 links * 2 sides). Use the SRL
# interface name (ethernet-1/X), not the linux veth (e1-X).
BB_INTERFACES = \
    ams-core-1:ethernet-1/1 \
    fra-core-1:ethernet-1/1 \
    ams-core-1:ethernet-1/2 \
    sto-core-1:ethernet-1/1 \
    fra-core-1:ethernet-1/2 \
    sto-core-1:ethernet-1/2 \
    fra-core-1:ethernet-1/3 \
    lju-core-1:ethernet-1/1 \
    sto-core-1:ethernet-1/3 \
    lju-core-1:ethernet-1/2

SHELL := /bin/bash

# sr_cli flags:
#   -e  → pre-command "enter candidate"
#   -c  → post-command "commit now"
# A single positional command runs in between.

.PHONY: bb-fail-random
bb-fail-random:
	@entries=( $(BB_INTERFACES) ); \
	count=$${#entries[@]}; \
	idx=$$(( RANDOM % count )); \
	pick=$${entries[$$idx]}; \
	router=$${pick%%:*}; iface=$${pick#*:}; \
	echo "Failing $$router $$iface (admin-state disable)"; \
	docker exec $(TESTENV)-$$router sr_cli -ec \
	    "set / interface $$iface admin-state disable"

.PHONY: bb-up-all
bb-up-all:
	@for entry in $(BB_INTERFACES); do \
	    router=$${entry%%:*}; iface=$${entry#*:}; \
	    echo "Restoring $$router $$iface (admin-state enable)"; \
	    docker exec $(TESTENV)-$$router sr_cli -ec \
	        "set / interface $$iface admin-state enable" \
	        || true; \
	done

# --- BGP session failure injection --------------------------------------------
# Drop 100% of packets on a PE's customer-facing port with netem. The link stays
# operationally UP, but BGP keepalives are lost, so the eBGP PE<->CE session drops
# after the negotiated hold time. This drives the reactive BGP-neighbor telemetry
# to escalate (debug-active=true) on the affected neighbor. (Interface error/
# discard counters do NOT move over containerlab veth, but BGP session state does.)
# Default: ams-core-1's customer access port e1-3 (ethernet-1/3.100 -> cust-1,
# eBGP neighbor 10.201.1.2 in network-instance acme-65501).
BGP_IMPAIR_ROUTER ?= ams-core-1
BGP_IMPAIR_IF     ?= e1-3

.PHONY: bgp-impair
bgp-impair:
	@echo "Dropping 100% of packets on $(BGP_IMPAIR_ROUTER) $(BGP_IMPAIR_IF) (link stays up; eBGP session drops after hold)"
	docker exec $(TESTENV)-$(BGP_IMPAIR_ROUTER) tc qdisc add dev $(BGP_IMPAIR_IF) root netem loss 100%

.PHONY: bgp-restore
bgp-restore:
	@echo "Removing netem on $(BGP_IMPAIR_ROUTER) $(BGP_IMPAIR_IF)"
	docker exec $(TESTENV)-$(BGP_IMPAIR_ROUTER) tc qdisc del dev $(BGP_IMPAIR_IF) root || true
