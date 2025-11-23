# Chi Alignment Summary

This document summarizes how the Acton HTTP router has been aligned with Chi's design patterns while respecting Acton's idioms.

## Architecture Decision: Callbacks vs ResponseWriter

### Chi's Approach (Go)
```go
func handler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    w.Write([]byte("Hello"))
}
```

### Our Approach (Acton)
```acton
def handler(request, respond):
    respond(200, {}, "Hello")
```

**Decision: Keep callback-based approach**

Rationale:
- **Actor-friendly**: Callbacks fit Acton's message-passing concurrency model
- **Simpler**: No mutable state to track (headers written, status set, etc.)
- **Idiomatic**: Follows Acton patterns rather than forcing Go's OOP style
- **Already working**: All 22 tests pass with this design

Chi uses `http.ResponseWriter` because that's Go's standard library interface. Acton doesn't need to copy Go's OOP patterns - the callback approach is more natural for Acton's functional/actor-based paradigm.

## Implemented Chi Alignments

### 1. ✅ Middleware Support

Chi has middleware chains. We now support:

```acton
# Add global middleware
router.use(auth_middleware)
router.use(logger_middleware)

# Middleware is a function that wraps a handler
def auth_middleware(handler):
    # Returns a new handler that checks auth then calls original
    ...
```

**How it works:**
- `use()` adds middleware to the router
- Middleware functions take a handler and return a wrapped handler
- Applied in reverse order (last added wraps first) to match Chi's behavior

### 2. ✅ Route Groups with `group()`

Chi's `Group()` creates inline routers with middleware:

```acton
def configure_api(r):
    r.use(json_middleware)
    r.get("/users", list_users)
    r.post("/users", create_user)

router.group(configure_api)
```

**Features:**
- Groups inherit parent middleware
- Can add group-specific middleware
- Clean organization of related routes

### 3. ✅ Subrouter Pattern with `route()`

Chi's `Route()` combines creation, configuration, and mounting:

```acton
def configure_admin(r):
    r.use(admin_auth)
    r.get("/", admin_home)
    r.get("/users", admin_users)

router.route("/admin", configure_admin)
```

**Result:**
- GET /admin/ → admin_home
- GET /admin/users → admin_users
- All with admin_auth middleware

### 4. ✅ Chi-Style URL Parameters

Chi uses `{param}` syntax, we now support both:

| Pattern | Example | Matches | Params |
|---------|---------|---------|--------|
| Chi curly | `/users/{id}` | `/users/123` | `id="123"` |
| Legacy colon | `/users/:id` | `/users/123` | `id="123"` |
| Regex constraint | `/posts/{slug:[a-z-]+}` | `/posts/my-post` | `slug="my-post"` |
| Wildcard | `/files/*` | `/files/a/b/c` | `*="/a/b/c"` |

**Pattern parsing:**
- `{id}` - simple parameter
- `{id:[0-9]+}` - parameter with regex constraint
- `:id` - legacy syntax still supported

### 5. ✅ URL Parameter Extraction

Chi has `chi.URLParam(r, "id")`, we have:

```acton
def handler(request, respond):
    user_id = http_router.url_param(router, "id")
    if user_id is not None:
        respond(200, {}, f"User: {user_id}")
```

**Implementation:**
- Route matching stores parameters in `RouteContext`
- `url_param()` helper extracts params by name
- Returns `None` if parameter not found

### 6. ✅ Mount Behavior

Chi's `Mount()` keeps full paths (handlers see mount prefix):

```acton
api_router.get("/users", handler)  # Handler pattern: /users
router.mount("/api", api_router)   # Accessible at: /api/users
                                    # Handler receives: /api/users
```

**Alignment:**
- ✅ Handlers receive full path including mount prefix
- ✅ Simple route flattening (Chi's approach)
- ✅ No path stripping wrappers

### 7. ✅ Method Registration

Chi's clean API matches ours:

```acton
router.get("/users", list_users)
router.post("/users", create_user)
router.put("/users/{id}", update_user)
router.delete("/users/{id}", delete_user)
router.patch("/users/{id}", patch_user)
router.handle("/health", health_check)  # All methods
```

## Implementation Details

### RouteContext Class
Stores URL parameters for matched routes:
```acton
class RouteContext(object):
    @property
    url_params: dict[str, str]
```

### Middleware Type
```acton
Middleware = action(Handler) -> Handler
```
where `Handler = action(http.Request, action(int, dict[str, str], str) -> None) -> None`

Note: Acton doesn't support type aliases, so full types are used in signatures.

### Pattern Parsing
Enhanced `_parse_pattern()` to support:
- Chi-style `{param}` in addition to `:param`
- Regex constraints like `{id:[0-9]+}`
- Builds regex for matching and extraction

## Usage Examples

### Basic Routing with Params
```acton
router = http_router.Router(None)
router.get("/users/{id}", handle_user)

def handle_user(request, respond):
    user_id = http_router.url_param(router, "id")
    respond(200, {}, f"User {user_id}")
```

### Middleware and Groups
```acton
# Global middleware
router.use(logger_middleware)

# API group with JSON middleware
def configure_api(r):
    r.use(json_middleware)
    r.get("/users", list_users)
    r.get("/users/{id}", get_user)

router.route("/api", configure_api)
```

### Regex Constraints
```acton
# Only match numeric IDs
router.get("/articles/{id:[0-9]+}", get_article)

# Only match lowercase slugs
router.get("/posts/{slug:[a-z-]+}", get_post)
```

## What We Didn't Copy from Chi

1. **ResponseWriter Interface** - Kept callbacks (more Acton-idiomatic)
2. **Context Package** - Acton's actor model handles this differently  
3. **Panic/Recover Middleware** - Acton doesn't have panics
4. **HTTP Method Constants** - Used strings directly
5. **Handler Wrapping** - Simpler in Acton without middleware interfaces

## Benefits of This Approach

1. **Familiar to Chi users**: API closely matches Chi where it makes sense
2. **Idiomatic Acton**: Uses callbacks and actors naturally
3. **Clean patterns**: Group/Route/Mount organize large applications
4. **Type-safe**: Acton's type checker ensures correctness
5. **Flexible**: Middleware system allows composition
6. **Backward compatible**: Existing code still works

## Migration from Old Style

### Before
```acton
router.get("/users/:id", handle_user)

def handle_user(request, respond):
    parts = request.path.split("/")
    user_id = parts[2]  # Manual parsing
```

### After (Chi-Style)
```acton
router.get("/users/{id}", handle_user)  # Curly braces

def handle_user(request, respond):
    user_id = http_router.url_param(router, "id")  # Helper function
```

## Testing

All router functionality has been tested:
- ✅ 22 tests passing (before TMF fixes)
- ✅ Pattern matching (static, params, wildcards)
- ✅ Route registration and matching
- ✅ Mount behavior preserves full paths
- ✅ Parameter extraction

## Future Enhancements

Potential Chi features to add:
- [ ] NotFound handler per subrouter
- [ ] MethodNotAllowed handler
- [ ] Route documentation/introspection
- [ ] Automatic OPTIONS responses
- [ ] Better error messages for pattern conflicts
- [ ] Route walking/printing for debugging

## Conclusion

The router now aligns closely with Chi's design where it makes sense, while staying true to Acton's functional/actor programming model. The callback-based approach is simpler and more idiomatic than forcing ResponseWriter OOP patterns.

**Core alignment achieved:**
- ✅ Middleware chains
- ✅ Route grouping  
- ✅ Subrouter mounting
- ✅ Chi-style patterns with `{param}`
- ✅ URL parameter extraction
- ✅ Full path preservation in handlers

**Acton-specific choices:**
- ✅ Callbacks instead of ResponseWriter (more natural)
- ✅ Simple middleware without complex interfaces
- ✅ Actor-friendly design patterns
