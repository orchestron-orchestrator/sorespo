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

ROUTERS ?= 3
ROADMS ?= 8
BACKBONE_LINKS ?= 3
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

.PHONY: ping
ping: test-ping

.PHONY: test-ping
test-ping::
	@router_count=$$(xmllint --xpath 'count(//*[local-name()="router"])' netinfra.xml); \
	routers=(); \
	for ((index = 1; index <= router_count; index++)); do \
		name=$$(xmllint --xpath "string((//*[local-name()='router'])[$$index]/*[local-name()='name'])" netinfra.xml); \
		id=$$(xmllint --xpath "string((//*[local-name()='router'])[$$index]/*[local-name()='id'])" netinfra.xml); \
		container=$$(printf '%s' "$$name" | tr '[:upper:]' '[:lower:]'); \
		routers+=("$$name|$$container|10.0.0.$$id"); \
	done; \
	failed=0; \
	for ((left = 0; left < router_count; left++)); do \
		IFS='|' read -r left_name left_container left_ip <<< "$${routers[$$left]}"; \
		for ((right = left + 1; right < router_count; right++)); do \
			IFS='|' read -r right_name right_container right_ip <<< "$${routers[$$right]}"; \
			printf '\n%s <-> %s\n' "$$left_name" "$$right_name"; \
			for direction in \
				"$$left_name|$$left_container|$$left_ip|$$right_name|$$right_ip" \
				"$$right_name|$$right_container|$$right_ip|$$left_name|$$left_ip"; do \
				IFS='|' read -r source_name source_container source_ip destination_name destination_ip <<< "$$direction"; \
				docker exec "$(TESTENV)-$$source_container" sr_cli \
					"ping -c 1 -W 1 -I $$source_ip network-instance default $$destination_ip" >/dev/null 2>&1 || true; \
				output=$$(docker exec "$(TESTENV)-$$source_container" sr_cli \
					"ping -c $(PING_COUNT) -I $$source_ip network-instance default $$destination_ip" 2>&1); \
				status=$$?; \
				latency=$$(printf '%s\n' "$$output" | sed -nE 's/^rtt min\/avg\/max\/mdev = ([0-9.]+)\/([0-9.]+)\/([0-9.]+)\/.* ms$$/min\/avg\/max \1\/\2\/\3 ms/p'); \
				loss=$$(printf '%s\n' "$$output" | sed -nE 's/.*, ([0-9.]+)% packet loss.*/\1% loss/p'); \
				if [[ $$status -eq 0 && -n "$$latency" ]]; then \
					printf '  %s -> %s: %s, %s\n' "$$source_name" "$$destination_name" "$$latency" "$$loss"; \
				else \
					printf '  %s -> %s: FAILED (%s)\n' "$$source_name" "$$destination_name" "$${loss:-no statistics}"; \
					failed=1; \
				fi; \
			done; \
		done; \
	done; \
	exit $$failed
