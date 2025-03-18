.PHONY: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-wait-,$(ROUTERS_XR)):
# Wait for "Interface MgmtEth0/RP0/CPU0/0, changed state to Up" to appear in the container logs
	timeout 60s bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Interface MgmtEth0/RP0/CPU0/0, changed state to Up'; do sleep 1; done"

$(addprefix platform-wait-,$(ROUTERS_CRPD)):
# Wait for "Server listening on unix:/var/run/japi_na-grpcd" to appear in the container logs
	timeout 60s bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Server listening on unix:/var/run/japi_na-grpcd'; do sleep 1; done"

.PHONY: cli $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-cli-,$(ROUTERS_XR)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) /pkg/bin/xr_cli.sh

$(addprefix platform-cli-,$(ROUTERS_CRPD)):
	docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) cli
