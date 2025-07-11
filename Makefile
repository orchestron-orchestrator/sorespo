
.PHONY: build
build:
	acton build --dev $(DEP_OVERRIDES) $(TARGET)

.PHONY: build-ldep
build-ldep:
	$(MAKE) build DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: build-linux
build-linux:
	$(MAKE) build TARGET="--target x86_64-linux-gnu.2.27"

.PHONY: build-aarch64
build-aarch64:
	$(MAKE) build TARGET="--target aarch64-linux-gnu.2.27"

.PHONY: test
test:
	acton test $(DEP_OVERRIDES)

test-ldep:
	$(MAKE) test DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: gen
gen:
	cd gen && acton build --dev $(DEP_OVERRIDES) && out/bin/sorespo_gen

.PHONY: gen-ldep
gen-ldep:
	$(MAKE) gen DEP_OVERRIDES="--dep netconf=../../netconf --dep orchestron=../../orchestron --dep yang=../../acton-yang"

.PHONY: pkg-upgrade
pkg-upgrade:
	acton pkg upgrade
	cd gen && acton pkg upgrade
