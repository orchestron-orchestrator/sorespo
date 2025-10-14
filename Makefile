
.PHONY: build
build:
	acton build $(DEP_OVERRIDES) $(TARGET)

.PHONY: build-ldep
build-ldep:
	$(MAKE) build DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: build-linux-x86_64
build-linux-x86_64:
	$(MAKE) build TARGET="--target x86_64-linux-gnu.2.27"

.PHONY: build-linux-aarch64
build-linux-aarch64:
	$(MAKE) build TARGET="--target aarch64-linux-gnu.2.27"

.PHONY: build-macos-aarch64
build-macos-aarch64:
	$(MAKE) build TARGET="--target aarch64-macos"

.PHONY: test
test:
	acton test $(DEP_OVERRIDES)

test-ldep:
	$(MAKE) test DEP_OVERRIDES="--dep netconf=../netconf --dep orchestron=../orchestron --dep yang=../acton-yang"

.PHONY: gen
gen:
	cd gen && acton build $(DEP_OVERRIDES) && out/bin/sorespo_gen

.PHONY: gen-ldep
gen-ldep:
	$(MAKE) gen DEP_OVERRIDES="--dep netconf=../../netconf --dep orchestron=../../orchestron --dep yang=../../acton-yang"

.PHONY: pkg-upgrade
pkg-upgrade:
	acton pkg upgrade
	cd gen && acton pkg upgrade

.PHONY: download-release
download-release:
	@if [ "$$(uname -s)" = "Darwin" ]; then \
		echo "Note: Downloading Linux binary for use in container (e.g., Colima)"; \
	fi; \
	ARCH=$$(uname -m); \
	if [ "$$ARCH" = "arm64" ]; then ARCH="aarch64"; fi; \
	RELEASE_FILE=sorespo-linux-$$ARCH.tar.gz; \
	echo "Downloading $$RELEASE_FILE from GitHub..."; \
	mkdir -p out/bin; \
	if ! curl -L -f -o /tmp/$$RELEASE_FILE https://github.com/orchestron-orchestrator/sorespo/releases/download/tip/$$RELEASE_FILE; then \
		echo "Error: Failed to download $$RELEASE_FILE - this platform may not have a pre-built release"; \
		exit 1; \
	fi; \
	echo "Extracting binary..."; \
	tar -xzf /tmp/$$RELEASE_FILE -C out/bin/; \
	chmod +x out/bin/sorespo; \
	rm /tmp/$$RELEASE_FILE; \
	echo "Download complete: out/bin/sorespo"
