# Chi-Style Router Patterns

This document demonstrates the Chi-inspired patterns now available in the Acton HTTP router.

## Basic Usage

```acton
import http_router

# Create a router
router = http_router.Router(None)

# Register simple routes
router.get("/", handle_home)
router.post("/api/users", create_user)
router.get("/api/users/{id}", get_user)
```

## URL Parameters

Use Chi-style `{param}` syntax (or legacy `:param` syntax):

```acton
# Chi-style patterns
router.get("/users/{id}", handle_user)
router.get("/posts/{slug}", handle_post)

# With regex constraints
router.get("/articles/{id:[0-9]+}", handle_article)

# Access params in handler
def handle_user(request, respond):
    user_id = http_router.url_param(router, "id")
    if user_id is not None:
        respond(200, {}, f"User ID: {user_id}")
```

## Middleware

Apply middleware to all routes:

```acton
# Add middleware to router
router.use(http_router.logger_middleware)
router.use(auth_middleware)

# All routes registered after use() will have middleware applied
router.get("/protected", handle_protected)
```

### Creating Custom Middleware

```acton
def auth_middleware(handler):
    """Middleware that checks authentication"""
    def wrapped_handler(req, respond):
        # Check auth header
        if "Authorization" not in req.headers:
            respond(401, {}, "Unauthorized")
            return
        
        # Call next handler
        handler(req, respond)
    
    return wrapped_handler

# Use it
router.use(auth_middleware)
```

## Route Groups

Group routes with shared middleware:

```acton
def configure_api(r):
    # Middleware only applies to routes in this group
    r.use(json_middleware)
    r.use(rate_limit_middleware)
    
    r.get("/users", list_users)
    r.post("/users", create_user)
    r.get("/users/{id}", get_user)

router.group(configure_api)
```

## Subrouters with Route()

The `route()` method combines router creation, configuration, and mounting:

```acton
def configure_admin(r):
    r.use(admin_auth_middleware)
    
    r.get("/", admin_dashboard)
    r.get("/users", admin_list_users)
    r.post("/users", admin_create_user)

# Mount at /admin - all routes get the prefix
router.route("/admin", configure_admin)

# Now these URLs work:
# GET /admin/
# GET /admin/users
# POST /admin/users
```

## Mount() for Complex Subrouters

For more control, create and mount subrouters explicitly:

```acton
# Create separate router
api_router = http_router.Router(None)
api_router.use(json_middleware)
api_router.get("/users", list_users)
api_router.get("/posts", list_posts)

# Mount it
router.mount("/api", api_router)
```

## Complete Example

```acton
import http
import http_router
import json

actor Main(env):
    # Create main router
    router = http_router.Router(None)
    
    # Global middleware
    router.use(http_router.logger_middleware)
    
    # Root route
    router.get("/", lambda req, respond: 
        respond(200, {}, "Welcome!"))
    
    # API routes with middleware
    def configure_api(r):
        r.use(json_middleware)
        
        # Users resource
        r.get("/users", list_users)
        r.post("/users", create_user)
        r.get("/users/{id}", get_user)
        r.put("/users/{id}", update_user)
        r.delete("/users/{id}", delete_user)
        
        # Posts resource
        r.get("/posts", list_posts)
        r.get("/posts/{slug:[a-z-]+}", get_post)
    
    router.route("/api", configure_api)
    
    # Admin routes with auth
    def configure_admin(r):
        r.use(admin_auth_middleware)
        r.get("/", admin_dashboard)
        r.get("/settings", admin_settings)
    
    router.route("/admin", configure_admin)
    
    # Start server
    def on_request(server, request, respond):
        router.handle_request(server, request, respond)
    
    listener = http.Listener(
        env.cap_cap.tcp_listen,
        "127.0.0.1",
        8080,
        on_request,
        None,
        None
    )
    
    env.await_async()


# Handler examples
def list_users(req, respond):
    users = [{"id": "1", "name": "Alice"}, {"id": "2", "name": "Bob"}]
    respond(200, {"Content-Type": "application/json"}, json.encode(users))

def get_user(req, respond):
    user_id = http_router.url_param(router, "id")
    if user_id is not None:
        user = {"id": user_id, "name": "Alice"}
        respond(200, {"Content-Type": "application/json"}, json.encode(user))
    else:
        respond(404, {}, "Not found")

# Middleware examples
def json_middleware(handler):
    def wrapped(req, respond):
        # Set JSON content type
        def json_respond(status, headers, body):
            headers["Content-Type"] = "application/json"
            respond(status, headers, body)
        
        handler(req, json_respond)
    return wrapped

def admin_auth_middleware(handler):
    def wrapped(req, respond):
        # Check admin token
        if "X-Admin-Token" not in req.headers:
            respond(403, {}, "Forbidden")
            return
        
        handler(req, respond)
    return wrapped
```

## Pattern Syntax Summary

| Pattern | Example | Matches | Params |
|---------|---------|---------|--------|
| Static | `/users` | `/users` exactly | none |
| Chi param | `/users/{id}` | `/users/123` | `id="123"` |
| Legacy param | `/users/:id` | `/users/123` | `id="123"` |
| Regex | `/posts/{slug:[a-z-]+}` | `/posts/hello-world` | `slug="hello-world"` |
| Wildcard | `/files/*` | `/files/a/b/c` | `*="/a/b/c"` |

## Migration from Old Patterns

### Old Style
```acton
router.get("/users/:id", handle_user)

def handle_user(request, respond):
    # Parse path manually
    parts = request.path.split("/")
    user_id = parts[2]
```

### New Chi Style
```acton
router.get("/users/{id}", handle_user)

def handle_user(request, respond):
    # Use url_param helper
    user_id = http_router.url_param(router, "id")
```

## Benefits of Chi-Style Patterns

1. **Cleaner syntax**: `{param}` is more readable than `:param`
2. **Regex constraints**: `{id:[0-9]+}` validates format in pattern
3. **Middleware chains**: Compose behavior like Chi's middleware
4. **Route groups**: Organize routes with shared middleware
5. **Familiar API**: Matches Chi's API for Go developers
