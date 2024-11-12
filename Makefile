

build:
	acton build

.PHONY: gen
gen:
	cd gen && acton build && out/bin/respnet_gen
