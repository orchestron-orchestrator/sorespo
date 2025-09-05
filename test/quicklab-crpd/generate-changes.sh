#!/bin/bash
# Generate config changes for testing the approval queue

# Get the Orchestron port
OTRON_PORT=$(docker inspect -f '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' sorespo-quicklab-crpd-otron)

if [ -z "$OTRON_PORT" ]; then
    echo "Error: Could not find Orchestron container port"
    exit 1
fi

echo "Using Orchestron at port: $OTRON_PORT"

# Function to send config
send_config() {
    local role=$1
    
    cat > /tmp/temp-config.xml <<EOF
<?xml version="1.0" encoding="utf-8"?>
<data>
    <netinfra xmlns="http://example.com/netinfra">
        <router>
            <name>FRA-CORE-1</name>
            <id>2</id>
            <role>$role</role>
        </router>
    </netinfra>
</data>
EOF
    
    echo "Sending config to set FRA-CORE-1 role to: $role"
    curl -X PUT \
        -H "Content-Type: application/yang-data+xml" \
        -H "Async: true" \
        -d @/tmp/temp-config.xml \
        "http://localhost:${OTRON_PORT}/restconf"
    echo ""
}

# Send multiple changes to create queue items
echo "Generating batch of config changes..."

# Change AMS-CORE-1 role
send_config "core"

# Change it back
send_config "edge"

## And again
#send_config "core"

echo "Done! Check the approval queue in the web UI"
