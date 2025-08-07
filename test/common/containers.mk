.PHONY: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL))

$(addprefix platform-wait-,$(ROUTERS_XR)):
# Wait for "smartlicserver[212]: %LICENSE-SMART_LIC-3-COMM_FAILED : Communications failure with the Cisco Smart License Utility (CSLU) : Unable to resolve server hostname/domain name" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'smartlicserver'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-otron ghcr.io/notconf/notconf:debug netconf-console2 --host $(@:platform-wait-%=%) --port 830 --user clab --pass clab@123 --hello

$(addprefix platform-wait-,$(ROUTERS_CRPD)):
# Wait for "Server listening on unix:/var/run/japi_na-grpcd" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Server listening on unix:/var/run/japi_na-grpcd'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-otron ghcr.io/notconf/notconf:debug netconf-console2 --host $(@:platform-wait-%=%) --port 830 --user clab --pass clab@123 --hello

$(addprefix platform-wait-,$(ROUTERS_SRL)):
# Wait for "Application license_mgr is running" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Application license_mgr is running'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-otron ghcr.io/notconf/notconf:debug netconf-console2 --host $(@:platform-wait-%=%) --port 830 --user clab --pass clab@123 --hello

.PHONY: cli $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD) $(ROUTERS_SRL) $(ROUTERS_FRR))

$(addprefix platform-cli-,$(ROUTERS_XR)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) /pkg/bin/xr_cli.sh

$(addprefix platform-cli-,$(ROUTERS_CRPD)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) cli

$(addprefix platform-cli-,$(ROUTERS_SRL)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) sr_cli

$(addprefix platform-cli-,$(ROUTERS_FRR)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) vtysh


$(addprefix test-ping-,$(ROUTERS_FRR)):
# brew install coreutils on MacOS
	timeout --foreground 10s bash -c "until docker exec -t $(TESTENV)-$(@:test-ping-%=%) ping -c 1 -W 1 -I $(SRC) $(IP); do sleep 1; done"

.PHONY: test-ping
test-ping::
# Do a full mesh of ping between all cust-X routers loopbacks
	@set -e; for i in 1 2 3 4; do \
		for j in 1 2 3 4; do \
			if [ $$i -ne $$j ]; then \
				$(MAKE) test-ping-cust-$$i SRC=10.200.1.$$i IP=10.200.1.$$j; \
			fi; \
		done; \
	done
