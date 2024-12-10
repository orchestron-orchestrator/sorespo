include clab.mk

start:
	$(CLAB_BIN) deploy --topo quicklab.clab.yml --log-level trace --reconfigure
	docker exec -it respnet-quicklab-otron bash -lc "apt-get update && apt-get install -qy ssh sshpass"

stop:
	$(CLAB_BIN) destroy --topo quicklab.clab.yml --log-level trace

copy:
	docker cp ../../out/bin/respnet respnet-quicklab-otron:/respnet
	docker cp l3vpn-svc1.xml respnet-quicklab-otron:/l3vpn-svc1.xml
	docker cp l3vpn-svc2.xml respnet-quicklab-otron:/l3vpn-svc2.xml

run-xr-only:
	docker exec -it respnet-quicklab-otron /respnet l3vpn-svc1.xml --rts-bt-dbg

run:
	docker exec -it respnet-quicklab-otron /respnet l3vpn-svc2.xml --rts-bt-dbg

.PHONY: shell
shell:
	docker exec -it respnet-quicklab-otron bash -l

.PHONY: send-config
send-config:
	curl -X POST -d @$(FILE) http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-otron)

.PHONY: get-config0 get-config1 get-config2 get-config3
get-config0 get-config1 get-config2 get-config3:
	curl http://localhost:$(shell docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' respnet-quicklab-otron)/layer/$(subst get-config,,$@)
