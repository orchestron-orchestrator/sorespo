
# Release builds are optimized and typically run faster.
# Override with `RELEASE=` for a debug build.
RELEASE ?= --release

.PHONY: build
build:
	acton build $(RELEASE) $(DEP_OVERRIDES) $(TARGET)

.PHONY: build-ldep
build-ldep:
	$(MAKE) build DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep actmf=../actmf --dep http_router=../http-router"

.PHONY: build-linux-x86_64
build-linux-x86_64:
	$(MAKE) build TARGET="--target x86_64-linux-gnu.2.27"

.PHONY: build-linux-aarch64
build-linux-aarch64:
	$(MAKE) build TARGET="--target aarch64-linux-gnu.2.27"

.PHONY: build-macos-aarch64
build-macos-aarch64:
	$(MAKE) build TARGET="--target aarch64-macos"

.PHONY: build-linux-aarch64-ldep
build-linux-aarch64-ldep:
	$(MAKE) build DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep actmf=../actmf --dep http_router=../http-router" TARGET="--target aarch64-linux-gnu.2.27"

.PHONY: test
test:
	acton test $(DEP_OVERRIDES)

test-ldep:
	$(MAKE) test DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep actmf=../actmf --dep http_router=../http-router"

.PHONY: gen
gen:
	cd spec && acton build $(RELEASE) $(DEP_OVERRIDES) && out/bin/sorespo_gen

.PHONY: gen-ldep
gen-ldep:
	$(MAKE) gen DEP_OVERRIDES="--dep netconf=../../netconf --dep stratoweave=../../stratoweave --dep yang=../../acton-yang --dep actmf=../../actmf --dep http_router=../../http-router"

.PHONY: pkg-upgrade
pkg-upgrade:
	acton pkg upgrade
	cd spec && acton pkg upgrade

.PHONY: check-dep-consistency
check-dep-consistency:
	@python3 scripts/check_dep_consistency.py

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
	if ! curl -L -f -o /tmp/$$RELEASE_FILE https://github.com/stratoweave/sorespo/releases/download/tip/$$RELEASE_FILE; then \
		echo "Error: Failed to download $$RELEASE_FILE - this platform may not have a pre-built release"; \
		exit 1; \
	fi; \
	echo "Extracting binary..."; \
	tar -xzf /tmp/$$RELEASE_FILE -C out/bin/; \
	chmod +x out/bin/sorespo; \
	rm /tmp/$$RELEASE_FILE; \
	echo "Download complete: out/bin/sorespo"

WEBUI_HOST ?= 127.0.0.1
WEBUI_PORT ?= 3000
STRATOWEAVE_API_ORIGIN ?= http://localhost:15000
WEBUI_PIDFILE ?= logs/webui-dev.pid
WEBUI_LOG ?= logs/webui-dev.log

.PHONY: start-webui
start-webui:
	@mkdir -p logs
	@listener_pid=$$(ss -ltnp '( sport = :$(WEBUI_PORT) )' 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1); \
	if [ -n "$$listener_pid" ]; then \
		cmd=$$(ps -p "$$listener_pid" -o args= 2>/dev/null); \
		if printf '%s' "$$cmd" | grep -Fq 'webui/node_modules/.bin/vite dev'; then \
			echo "$$listener_pid" > "$(WEBUI_PIDFILE)"; \
			echo "WebUI dev server already running on http://$(WEBUI_HOST):$(WEBUI_PORT) (pid $$listener_pid)"; \
			echo "Log: $(WEBUI_LOG)"; \
			exit 0; \
		fi; \
		echo "Port $(WEBUI_PORT) is already in use by: $$cmd"; \
		exit 1; \
	fi
	@other_webui_pids=$$(ps -C node -o pid=,args= | sed -n '\|$(CURDIR)/webui/node_modules/.bin/vite dev|s/^[[:space:]]*\([0-9]\+\)[[:space:]].*/\1/p'); \
	if [ -n "$$other_webui_pids" ]; then \
		echo "Found existing WebUI dev process(es): $$other_webui_pids"; \
		echo "Run 'make stop-webui' first"; \
		exit 1; \
	fi
	@if [ -f "$(WEBUI_PIDFILE)" ]; then \
		pid=$$(cat "$(WEBUI_PIDFILE)"); \
		if kill -0 "$$pid" 2>/dev/null; then \
			echo "Tracked WebUI process $$pid is still running but not listening on port $(WEBUI_PORT)"; \
			echo "Run 'make stop-webui' first"; \
			exit 1; \
		fi; \
		rm -f "$(WEBUI_PIDFILE)"; \
	fi
	@echo "Starting WebUI dev server on http://$(WEBUI_HOST):$(WEBUI_PORT)"
	@echo "Proxying API requests to $(STRATOWEAVE_API_ORIGIN)"
	@setsid env STRATOWEAVE_API_ORIGIN="$(STRATOWEAVE_API_ORIGIN)" npm --prefix webui run dev -- --host $(WEBUI_HOST) --port $(WEBUI_PORT) --strictPort </dev/null >"$(WEBUI_LOG)" 2>&1 &
	@sleep 3
	@listener_pid=$$(ss -ltnp '( sport = :$(WEBUI_PORT) )' 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1); \
	if [ -n "$$listener_pid" ]; then \
		echo "$$listener_pid" > "$(WEBUI_PIDFILE)"; \
		echo "WebUI dev server started (pid $$listener_pid)"; \
		echo "Log: $(WEBUI_LOG)"; \
	else \
		echo "Failed to start WebUI dev server"; \
		rm -f "$(WEBUI_PIDFILE)"; \
		tail -n 40 "$(WEBUI_LOG)" 2>/dev/null || true; \
		exit 1; \
	fi

.PHONY: stop-webui
stop-webui:
	@stopped=0; \
	for pid in $$(ps -C node -o pid=,args= | sed -n '\|$(CURDIR)/webui/node_modules/.bin/vite dev|s/^[[:space:]]*\([0-9]\+\)[[:space:]].*/\1/p'); do \
		if [ "$$pid" != "$$$$" ]; then \
			kill "$$pid" 2>/dev/null || true; \
			stopped=1; \
		fi; \
	done; \
	listener_pid=$$(ss -ltnp '( sport = :$(WEBUI_PORT) )' 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1); \
	if [ -n "$$listener_pid" ]; then \
		cmd=$$(ps -p "$$listener_pid" -o args= 2>/dev/null); \
		if printf '%s' "$$cmd" | grep -Fq 'webui/node_modules/.bin/vite dev'; then \
			kill "$$listener_pid" 2>/dev/null || true; \
			stopped=1; \
		else \
			echo "Port $(WEBUI_PORT) is in use by a non-WebUI process: $$cmd"; \
		fi; \
	fi; \
	if [ -f "$(WEBUI_PIDFILE)" ]; then \
		pid=$$(cat "$(WEBUI_PIDFILE)"); \
		if [ -n "$$pid" ] && [ "$$pid" != "$$$$" ] && kill -0 "$$pid" 2>/dev/null; then \
			kill "$$pid" 2>/dev/null || true; \
			stopped=1; \
		fi; \
		rm -f "$(WEBUI_PIDFILE)"; \
	fi; \
	if [ "$$stopped" -eq 1 ]; then \
		echo "WebUI dev server stopped"; \
	else \
		echo "WebUI dev server is not running"; \
	fi
