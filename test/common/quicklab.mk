build-otron-image:
	docker build -t respnet-otron-base -f ../common/Dockerfile.otron .

start: build-otron-image
	$(CLAB_BIN) deploy --topo $(TESTENV:respnet-%=%).clab.yml --log-level trace --reconfigure

stop:
	$(CLAB_BIN) destroy --topo $(TESTENV:respnet-%=%).clab.yml --log-level trace

copy:
	docker cp ../../out/bin/respnet $(TESTENV)-otron:/respnet
	docker cp l3vpn-svc.xml $(TESTENV)-otron:/l3vpn-svc.xml
	docker cp netinfra.xml $(TESTENV)-otron:/netinfra.xml

run:
	docker exec -it $(TESTENV)-otron /respnet --rts-bt-dbg

run-and-configure:
	docker exec -it $(TESTENV)-otron /respnet netinfra.xml l3vpn-svc.xml --rts-bt-dbg

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

.PHONY: get-config0 get-config1 get-config2 get-config3
get-config0 get-config1 get-config2 get-config3:
	curl -H "Accept: application/yang-data+xml" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/layer/$(subst get-config,,$@)

.PHONY: get-config-json0 get-config-json1 get-config-json2 get-config-json3
get-config-json0 get-config-json1 get-config-json2 get-config-json3:
	@curl -H "Accept: application/yang-data+json" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/layer/$(subst get-config-json,,$@)

.PHONY: delete-config
delete-config:
	curl -X DELETE http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' $(TESTENV)-otron)/restconf/netinfra:netinfra/routers=STO-CORE-1

.PHONY: $(addprefix cli-,$(ROUTERS_XR))
$(addprefix cli-,$(ROUTERS_XR)):
	docker exec -it $(TESTENV)-$(subst cli-,,$@) /pkg/bin/xr_cli.sh

.PHONY: $(addprefix cli-,$(ROUTERS_CRPD))
$(addprefix cli-,$(ROUTERS_CRPD)):
	docker exec -it $(TESTENV)-$(subst cli-,,$@) cli

.PHONY: $(addprefix get-dev-config-,$(ROUTERS_XR) $(ROUTERS_CRPD))
$(addprefix get-dev-config-,$(ROUTERS_XR) $(ROUTERS_CRPD)):
	docker run -it --rm --network container:$(TESTENV)-$(@:get-dev-config-%=%) ghcr.io/notconf/notconf:debug netconf-console2 --port 830 --user clab --pass clab@123 --get-config
