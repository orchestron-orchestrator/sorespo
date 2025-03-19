.PHONY: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-wait-,$(ROUTERS_XR)):
# Wait for "smartlicserver[212]: %LICENSE-SMART_LIC-3-COMM_FAILED : Communications failure with the Cisco Smart License Utility (CSLU) : Unable to resolve server hostname/domain name" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'smartlicserver'; do sleep 1; done"

$(addprefix platform-wait-,$(ROUTERS_CRPD)):
# Wait for "Server listening on unix:/var/run/japi_na-grpcd" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Server listening on unix:/var/run/japi_na-grpcd'; do sleep 1; done"

.PHONY: cli $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-cli-,$(ROUTERS_XR)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) /pkg/bin/xr_cli.sh

$(addprefix platform-cli-,$(ROUTERS_CRPD)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) cli

test:: test-ping

# These test-ping-% recipes will "install" themselves for all PE routers too.
# Pretty sure pinging the customer loopback from the default VRF in core does
# not work, but these are internal helpers anyway ...
$(addprefix test-ping-,$(ROUTERS_CRPD)):
# brew install coreutils on MacOS
	timeout --foreground 10s bash -c "until docker exec -t $(TESTENV)-$(@:test-ping-%=%) ping -c 1 -W 1 $(IP); do sleep 1; done"

$(addprefix test-ping-,$(ROUTERS_XR)):
# brew install coreutils on MacOS
	timeout --foreground 10s bash -c "until docker exec -t $(TESTENV)-$(@:test-ping-%=%) ip netns exec global-vrf ping -c 1 -W 1 $(IP); do sleep 1; done"

.PHONY: test-ping
test-ping:
# Do a full mesh of ping between all cust-X routers loopbacks
	@set -e; for i in 1 2 3 4; do \
		for j in 1 2 3 4; do \
			if [ $$i -ne $$j ]; then \
				$(MAKE) test-ping-cust-$$i IP=10.200.1.$$j; \
			fi; \
		done; \
	done
