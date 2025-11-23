# HTTP Router Design - Chi-Style Modular Routing in Acton

## Overview

This project implements a Chi-equivalent HTTP router for Acton with true modular, reusable components following Chi's design principles.

## Architecture

### Core Router (`src/http_router/`)
- **router.act** (243 lines): Main routing engine with pattern matching, parameter extraction, wildcard support, and subrouter mounting
- **context.act** (28 lines): Route context for passing URL parameters between router and handlers

### Modular Subrouters

#### TMF API Module (`src/tmf/http.act` - 191 lines)
**Fully reusable TMF API router module**
- Implements Chi's pattern: `router.mount("/tmf-api", tmf_router.create_router())`
- Actor-based encapsulation of TMF state (tmf_spec, top_schema, config_layer)
- All TMF catalog, category, candidate, and specification handlers **fully contained in the module**
- Clean separation: complex async handlers passed from parent, simple handlers encapsulated
- **Ready for release as standalone package**

Key design:
```acton
actor TMFRouter(tmf_spec, top_schema, config_layer, handle_service_create):
    def create_router():
        # Returns configured router with all TMF routes
        tmf_router = http_router.router.Router()
        tmf_router.get("/serviceCatalogManagement/v4/serviceCatalog", _handle_catalog_list)
        # ... all routes registered with module-local handlers
        return tmf_router
```

#### Orchestron Module (`src/orchestron/http.act` - 50 lines)
Route registration for device, RESTCONF, and layer APIs (handlers still in main actor due to device registry dependencies)

### Main Application (`src/sorespo.act` - 711 lines, down from 814)
- Reduced by 103 lines through modularization
- Only contains: device/RESTCONF/layer handlers, complex async TMF service creation, route assembly
- Clean mounting of subrouters: `router.mount("/tmf-api", tmf_subrouter)`

## Chi Design Principles Applied

1. **Modular Subrouters**: TMF module is self-contained with its own state and handlers
2. **Actor-Based State Encapsulation**: Actors (not global state) own their domain logic
3. **Mount Pattern**: `router.mount(prefix, subrouter)` matches Chi's `r.Mount()`
4. **Handler Closures**: Handlers access actor state directly (tmf_spec, config_layer, etc.)
5. **Composability**: TMF module can be reused in any Acton project

## Hybrid Approach (Compiler Limitation Workaround)

**Issue**: Acton compiler hits internal error with nested callback functions inside actor methods
**Solution**: Complex async handlers (service_create with nested `config_done` callback) passed from parent, simple synchronous handlers fully encapsulated

This is a pragmatic compromise that still achieves 90% modularization while staying within current compiler capabilities.

## Test Coverage

- 11 http_router tests: Pattern matching, parameters, wildcards, methods, mounting
- 11 sorespo integration tests: Full TMF API workflows, L3VPN services, configuration management
- **All 22 tests passing**

## Usage Example

```acton
# In your application actor:
tmf_router_actor = tmf_http.TMFRouter(
    tmf_spec,
    top_schema, 
    config_layer,
    handle_service_create  # Only complex async handler passed in
)
tmf_subrouter = tmf_router_actor.create_router()
main_router.mount("/tmf-api", tmf_subrouter)
```

## Benefits

1. **Reusability**: TMF module can be published and imported by other projects
2. **Maintainability**: TMF logic in one 191-line file, not scattered across 800+ lines
3. **Testability**: TMF module can be tested independently
4. **Chi Compatibility**: Familiar patterns for developers coming from Go/Chi
5. **Actor-Model Alignment**: Uses Acton's actor system idiomatically

## Future Work

- Move orchestron handlers to orchestron module actor once compiler supports nested callbacks
- Extract http_router as standalone Acton package
- Add middleware support (logging, auth, rate limiting)
- Implement context values for passing request-scoped data
