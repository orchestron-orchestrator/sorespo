
build:
	acton build --dev

.PHONY: gen
gen:
	cd gen && acton build --dev $(DEP_OVERRIDES) && out/bin/respnet_gen

.PHONY: gen-ldep
gen-ldep:
	$(MAKE) gen DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"
