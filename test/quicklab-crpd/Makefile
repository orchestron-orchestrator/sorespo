include clab.mk

start:
	$(CLAB_BIN) deploy --topo quicklab-crpd.clab.yml --log-level trace --reconfigure
	docker exec -it respnet-quicklab-crpd-otron bash -lc "apt-get update && apt-get install -qy ssh sshpass gdb"

stop:
	$(CLAB_BIN) destroy --topo quicklab-crpd.clab.yml --log-level trace

copy:
	docker cp ../../out/bin/respnet respnet-quicklab-crpd-otron:/respnet
	docker cp l3vpn-svc.xml respnet-quicklab-crpd-otron:/l3vpn-svc.xml
	docker cp netinfra.xml respnet-quicklab-crpd-otron:/netinfra.xml

run:
	docker exec -it respnet-quicklab-crpd-otron /respnet --rts-bt-dbg

run-and-configure:
	docker exec -it respnet-quicklab-crpd-otron /respnet netinfra.xml l3vpn-svc.xml --rts-bt-dbg

configure:
	$(MAKE) FILE="netinfra.xml" send-config
	$(MAKE) FILE="l3vpn-svc.xml" send-config

.PHONY: shell
shell:
	docker exec -it respnet-quicklab-crpd-otron bash -l

.PHONY: send-config
send-config:
	curl -X PUT -H "Content-Type: application/yang-data+xml" -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-crpd-otron)/restconf

.PHONY: send-config-json
send-config-json:
	curl -X PUT -H "Content-Type: application/yang-data+json" -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-crpd-otron)/restconf

.PHONY: get-config0 get-config1 get-config2 get-config3
get-config0 get-config1 get-config2 get-config3:
	curl -H "Accept: application/yang-data+xml" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-crpd-otron)/layer/$(subst get-config,,$@)

.PHONY: get-config-json0 get-config-json1 get-config-json2 get-config-json3
get-config-json0 get-config-json1 get-config-json2 get-config-json3:
	@curl -H "Accept: application/yang-data+json" http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-crpd-otron)/layer/$(subst get-config-json,,$@)

.PHONY: delete-config
delete-config:
	curl -X DELETE http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-crpd-otron)/restconf/netinfra:netinfra/routers=STO-CORE-1

cli-ams-core-1 cli-fra-core-1 cli-cust-1 cli-cust-2 cli-cust-3 cli-cust-4:
	docker exec -it respnet-quicklab-crpd-$(subst cli-,,$@) cli

cli-sto-core-1 cli-lju-core-1:
	docker exec -it respnet-quicklab-crpd-$(subst cli-,,$@) cli
