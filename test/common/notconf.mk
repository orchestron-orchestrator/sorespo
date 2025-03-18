.PHONY: $(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD))

$(addprefix platform-cli-,$(ROUTERS_XR) $(ROUTERS_CRPD)):
	@echo "Executing netopeer2-cli on $(subst platform-cli-,,$@). To start, type 'connect -u admin'"
	@docker exec -it $(TESTENV)-$(subst platform-cli-,,$@) netopeer2-cli
