.PHONY: $(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-wait-,$(ROUTERS_XR) $(ROUTERS_CRPD)):
# Wait for "Listening on 0.0.0.0:830 for SSH connections" to appear in the container logs
	timeout --foreground $(WAIT) bash -c "until docker logs $(TESTENV)-$(@:platform-wait-%=%) 2>&1 | grep -q 'Listening on 0.0.0.0:830 for SSH connections'; do sleep 1; done"
	docker run $(INTERACTIVE) --rm --network container:$(TESTENV)-otron ghcr.io/orchestron-orchestrator/ncurl --host $(@:platform-wait-%=%) --port 830 --username clab --password clab@123 hello

.PHONY: $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD)):
	@echo "Executing netopeer2-cli on $(subst platform-cli-,,$@). To start, type 'connect -u admin'"
	@docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) netopeer2-cli
