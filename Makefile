
.PHONY: build
build:
	acton build --dev $(DEP_OVERRIDES) $(TARGET)

.PHONY: build-ldep
build-ldep:
	$(MAKE) build DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: build-linux
build-linux:
	$(MAKE) build TARGET="--target x86_64-linux-gnu.2.27"
	cp out/bin/respnet out/bin/respnet-linux-amd64

.PHONY: build-aarch64
build-aarch64:
	$(MAKE) build TARGET="--target aarch64-linux-gnu.2.27"
	cp out/bin/respnet out/bin/respnet-linux-arm64

.PHONY: test
test:
	acton test $(DEP_OVERRIDES)

test-ldep:
	$(MAKE) test DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: gen
gen:
	cd gen && acton build --dev $(DEP_OVERRIDES) && out/bin/respnet_gen

.PHONY: gen-ldep
gen-ldep:
	$(MAKE) gen DEP_OVERRIDES="--dep netconf=../../netconf --dep orchestron=../../orchestron --dep yang=../../acton-yang"

.PHONY: pkg-upgrade
pkg-upgrade:
	acton pkg upgrade
	cd gen && acton pkg upgrade

container-image-build:
	docker build --build-arg IMAGE_PATH=$(IMAGE_PATH) --build-arg PLATFORM=$(if $(PLATFORM),-$(subst /,-,$(PLATFORM))) $(if $(PLATFORM),--platform $(PLATFORM)) -t $(IMAGE_PATH)sorespo:$(if $(PLATFORM),$(subst /,-,$(PLATFORM)),latest) -f test/common/Dockerfile.otron .

container-image-push:
	docker push $(IMAGE_PATH)sorespo:$(if $(PLATFORM),$(subst /,-,$(PLATFORM)),latest)

container-image-build-multi:
	$(MAKE) container-image-build PLATFORM="linux/amd64"
	$(MAKE) container-image-build PLATFORM="linux/arm64"

container-image-push-multi:
	$(MAKE) container-image-push PLATFORM="linux/amd64"
	$(MAKE) container-image-push PLATFORM="linux/arm64"

container-manifest-create:
	docker manifest create $(IMAGE_PATH)sorespo:latest $(IMAGE_PATH)sorespo:linux-amd64 $(IMAGE_PATH)sorespo:linux-arm64

container-manifest-push:
	docker manifest push $(IMAGE_PATH)sorespo:latest
