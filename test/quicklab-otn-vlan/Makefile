TESTENV=sorespo-quicklab-otn-vlan
TOPOLOGY_GENERATOR=./randomize.py

ROUTERS_SRL=$(shell python3 $(TOPOLOGY_GENERATOR) router-nodes netinfra.xml 2>/dev/null)
ROUTERS_FRR=
CPE_IDS=
POST_DEPLOY_TARGETS=apply-optical-latency
BB_INTERFACES=$(shell python3 $(TOPOLOGY_GENERATOR) backbone-interfaces netinfra.xml 2>/dev/null)

include ../common/clab.mk
include ../common/containers.mk
include ../common/quicklab.mk

SHELL := /bin/bash

ROUTERS ?= 15
ROADMS ?= 30
BACKBONE_LINKS ?= 27
MIN_SPAN_KM ?= 200
MAX_SPAN_KM ?= 500
SEED ?=

.PHONY: randomize
randomize:
	@set -e; \
	tmpdir=$$(mktemp -d); \
	trap 'rm -rf "$$tmpdir"' EXIT; \
	python3 $(TOPOLOGY_GENERATOR) generate \
		--routers $(ROUTERS) \
		--roadms $(ROADMS) \
		--backbone-links $(BACKBONE_LINKS) \
		--min-span-km $(MIN_SPAN_KM) \
		--max-span-km $(MAX_SPAN_KM) \
		--netinfra "$$tmpdir/netinfra.xml" \
		--topology "$$tmpdir/quicklab-otn-vlan.clab.yml" \
		$(if $(SEED),--seed $(SEED),); \
	if docker ps -aq --filter "label=containerlab=$(TESTENV)" | grep -q .; then \
		echo "Destroying the running $(TESTENV) topology before replacing it"; \
		$(CLAB_BIN) destroy --topo $(TESTENV:sorespo-%=%).clab.yml --log-level info; \
	fi; \
	mv "$$tmpdir/netinfra.xml" netinfra.xml; \
	mv "$$tmpdir/quicklab-otn-vlan.clab.yml" quicklab-otn-vlan.clab.yml

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

.PHONY: copy
copy:
	docker cp ../../out/bin/sorespo $(TESTENV)-sweave:/sorespo
	docker cp netinfra.xml $(TESTENV)-sweave:/netinfra.xml

.PHONY: run
run:
	docker exec $(INTERACTIVE) $(TESTENV)-sweave /sorespo --rts-bt-dbg

.PHONY: run-and-configure
run-and-configure:
	docker exec $(INTERACTIVE) $(TESTENV)-sweave /sorespo $(EXIT_ON_DONE) netinfra.xml --rts-bt-dbg

.PHONY: configure
configure:
	$(MAKE) send-config-wait FILE="netinfra.xml"

.PHONY: apply-optical-latency
apply-optical-latency:
	@link_count=$$(xmllint --xpath 'count(//*[local-name()="optical-link"])' netinfra.xml); \
	for ((index = 1; index <= link_count; index++)); do \
		left_roadm=$$(xmllint --xpath "string((//*[local-name()='optical-link'])[$$index]/*[local-name()='left-roadm'])" netinfra.xml | tr '[:upper:]' '[:lower:]'); \
		left_port=$$(xmllint --xpath "string((//*[local-name()='optical-link'])[$$index]/*[local-name()='left-port'])" netinfra.xml | sed -E 's|^ethernet-|e|; s|/|-|g'); \
		right_roadm=$$(xmllint --xpath "string((//*[local-name()='optical-link'])[$$index]/*[local-name()='right-roadm'])" netinfra.xml | tr '[:upper:]' '[:lower:]'); \
		right_port=$$(xmllint --xpath "string((//*[local-name()='optical-link'])[$$index]/*[local-name()='right-port'])" netinfra.xml | sed -E 's|^ethernet-|e|; s|/|-|g'); \
		latency=$$(xmllint --xpath "string((//*[local-name()='optical-link'])[$$index]/*[local-name()='latency'])" netinfra.xml); \
		if [[ -z "$$latency" ]]; then \
			echo "Missing latency for optical link $$left_roadm <-> $$right_roadm" >&2; \
			exit 1; \
		fi; \
		echo "Applying $${latency}us one-way latency to $$left_roadm:$$left_port <-> $$right_roadm:$$right_port"; \
		$(CLAB_BIN) tools netem set --node "$(TESTENV)-$$left_roadm" --interface "$$left_port" --delay "$${latency}us"; \
		$(CLAB_BIN) tools netem set --node "$(TESTENV)-$$right_roadm" --interface "$$right_port" --delay "$${latency}us"; \
	done

PING_COUNT ?= 3
PING_WORKERS ?= 32

.PHONY: ping
ping: test-ping

.PHONY: test-ping
test-ping::
	@python3 ping_test.py --testenv "$(TESTENV)" --count "$(PING_COUNT)" --workers "$(PING_WORKERS)" netinfra.xml
