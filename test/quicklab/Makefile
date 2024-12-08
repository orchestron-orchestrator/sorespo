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
