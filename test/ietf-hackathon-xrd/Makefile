TESTENV = sorespo-ietf-hackathon-xrd
TOPOLOGY = ietf-hackathon-xrd.clab.yml
NCURL ?= ../../../stratoweave/out/bin/ncurl
EXTERNAL_NETCONF = --host 172.100.60.12 --port 830 --username clab \
	--password clab@123 --insecure
CLEAR_PEER ?= 10.0.48.1

include ../common/clab.mk

.PHONY: start stop wait copy run state session-clear

start:
	$(CLAB_BIN) deploy --topo $(TOPOLOGY) --reconfigure

stop:
	$(CLAB_BIN) destroy --topo $(TOPOLOGY)

wait:
	timeout --foreground 180 bash -c 'until docker logs $(TESTENV)-xrd-a 2>&1 | grep -q smartlicserver; do sleep 2; done'
	timeout --foreground 180 bash -c 'until docker logs $(TESTENV)-xrd-b 2>&1 | grep -q smartlicserver; do sleep 2; done'

copy:
	docker cp ../../out/bin/sorespo $(TESTENV)-sweave:/sorespo
	docker cp netinfra.xml $(TESTENV)-sweave:/netinfra.xml

run:
	docker exec -it $(TESTENV)-sweave /sorespo /netinfra.xml \
		--udp-notif-receiver-address 172.100.60.10 \
		--udp-notif-source-interface MgmtEth0/RP0/CPU0/0

state:
	curl -fsS -H 'Accept: application/yang-data+json' \
		http://127.0.0.1:18080/restconf/data | \
		jq '."netinfra:netinfra"."ebgp-peer"'

session-clear:
	printf '%s\n' '<clear-bgp-ip-addr xmlns="http://cisco.com/ns/yang/Cisco-IOS-XR-ipv4-bgp-act"><ip-addr>$(CLEAR_PEER)</ip-addr></clear-bgp-ip-addr>' | \
		$(NCURL) $(EXTERNAL_NETCONF) rpc /dev/stdin
