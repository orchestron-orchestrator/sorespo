build-otron-image:
	docker build -t respnet-otron-base -f ../common/Dockerfile.otron .

licenses/%:
# Ensure the symlink to the licenses private repo exists in the project root
	@if [ ! -d ../../licenses ]; then \
		echo "Error: licenses directory not found."; \
		if [ ! -d ../../../licenses ]; then \
			REMOTE_URL=$$(git remote get-url origin); \
			LICENSES_URL="$$(echo "$$REMOTE_URL" | sed -E 's|/[^/]+$$|/licenses.git|')"; \
			echo "Cloning licenses repository from $$LICENSES_URL"; \
			(cd ../../.. && git clone "$$LICENSES_URL") || \
			(echo "Failed to clone licenses repository." && exit 1); \
		else \
			echo "Found existing licenses repository at ../../../licenses"; \
		fi; \
		echo "Creating symlink to licenses directory..."; \
		ln -s ../licenses ../../licenses || \
		(echo "Failed to create symlink to licenses directory." && exit 1); \
	fi
# Copy the requested license file to the test directory. We run containerlab in
# a container, meaning we cannot follow a symlink outside of the current
# project directory.
	mkdir -p licenses
	cp ../../licenses/$* $@

start: build-otron-image
	$(CLAB_BIN) deploy --topo $(TESTENV:respnet-%=%).clab.yml --log-level debug --reconfigure

stop:
	$(CLAB_BIN) destroy --topo $(TESTENV:respnet-%=%).clab.yml --log-level debug

.PHONY: wait $(addprefix wait-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
WAIT?=60
wait: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))

copy:
	docker cp ../../out/bin/respnet $(TESTENV)-otron:/respnet
	docker cp l3vpn-svc.xml $(TESTENV)-otron:/l3vpn-svc.xml
	docker cp netinfra.xml $(TESTENV)-otron:/netinfra.xml

run:
	docker exec $(INTERACTIVE) $(TESTENV)-otron /respnet --rts-bt-dbg

ifndef CI
INTERACTIVE=-it
endif

run-and-configure:
	docker exec $(INTERACTIVE) -e EXIT_ON_DONE=$(CI) $(TESTENV)-otron /respnet netinfra.xml l3vpn-svc.xml --rts-bt-dbg

configure:
	$(MAKE) FILE="netinfra.xml" send-config
	$(MAKE) FILE="l3vpn-svc.xml" send-config

.PHONY: shell
shell:
	docker exec -it $(TESTENV)-otron bash -l

.PHONY: send-config
send-config:
	curl -X PUT -H "Content-Type: application/yang-data+xml" -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/restconf

.PHONY: send-config-json
send-config-json:
	curl -X PUT -H "Content-Type: application/yang-data+json" -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/restconf

.PHONY: send-config-tmf
send-config-tmf:
	curl -X POST -H "Content-Type: application/json" -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/tmf-api/serviceOrdering/v4/serviceOrder

.PHONY: get-config-tmf
get-config-tmf:
	curl -X GET http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/tmf-api/serviceOrdering/v4/serviceOrder$(if $(ID),/$(ID),)

.PHONY: get-config0 get-config1 get-config2 get-config3
get-config0 get-config1 get-config2 get-config3:
	curl -H "Accept: application/yang-data+xml" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/layer/$(subst get-config,,$@)

.PHONY: get-config-json0 get-config-json1 get-config-json2 get-config-json3
get-config-json0 get-config-json1 get-config-json2 get-config-json3:
	@curl -H "Accept: application/yang-data+json" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/layer/$(subst get-config-json,,$@)

.PHONY: get-config-adata0 get-config-adata1 get-config-adata2 get-config-adata3
get-config-adata0 get-config-adata1 get-config-adata2 get-config-adata3:
	@curl -H "Accept: application/adata+text" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/layer/$(subst get-config-adata,,$@)

# "target" is the Orchestron's intended configuration, i.e. the configuration
# *we* want on the device. Note how this is not NMDA-speak for "intended
# configuration" of the device itself.
.PHONY: $(addprefix get-target-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix get-target-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	@curl $(HEADERS) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/device/$(subst get-target-,,$@)/target

.PHONY: $(addprefix get-target-adata-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix get-target-adata-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	@$(MAKE) HEADERS="-H \"Accept: application/adata+text\"" $(subst adata-,,$@)

# "running" is the currently running configuration on the device, which in
# NMDA-speak is the "intended configuration".
.PHONY: $(addprefix get-running-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix get-running-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	@curl $(HEADERS) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/device/$(subst get-running-,,$@)/running

.PHONY: $(addprefix get-running-adata-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix get-running-adata-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	@$(MAKE) HEADERS="-H \"Accept: application/adata+text\"" $(subst adata-,,$@)

.PHONY: delete-config
delete-config:
	curl -X DELETE http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/restconf/netinfra:netinfra/routers=STO-CORE-1

.PHONY: $(addprefix cli-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix cli-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)): cli-%: platform-cli-%

.PHONY: $(addprefix get-dev-config-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix get-dev-config-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-otron ghcr.io/notconf/notconf:debug netconf-console2 --host $(@:get-dev-config-%=%) --port 830 --user clab --pass clab@123 --get-config

.phony: test
test::
	$(MAKE) $(addprefix get-dev-config-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))

.PHONY: save-logs
save-logs: $(addprefix save-logs-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))

.PHONY: $(addprefix save-logs-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))
$(addprefix save-logs-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL)):
	mkdir -p logs
	docker logs --timestamps $(TESTENV)-$(@:save-logs-%=%) > logs/$(@:save-logs-%=%)_docker.log 2>&1
	$(MAKE) get-dev-config-$(@:save-logs-%=%) > logs/$(@:save-logs-%=%)_netconf.log || true
