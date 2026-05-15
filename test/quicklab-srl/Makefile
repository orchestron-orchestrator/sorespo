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
