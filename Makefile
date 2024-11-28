

build:
	acton build --dev

.PHONY: gen
gen:
	cd gen && acton build && out/bin/respnet_gen
