include clab.mk

start:
	$(CLAB_BIN) deploy --topo quicklab.clab.yml --log-level trace --reconfigure

stop:
	$(CLAB_BIN) destroy --topo quicklab.clab.yml --log-level trace

copy:
	docker cp ../../out/bin/respnet respnet-quicklab-nso:/respnet
	docker cp netinfra1.xml respnet-quicklab-nso:/netinfra1.xml

run:
	docker exec -it respnet-quicklab-nso /respnet netinfra1.xml
