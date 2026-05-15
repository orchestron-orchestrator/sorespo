#!/bin/bash
# Generate config changes for testing the approval queue

STRATOWEAVE_HTTP_ORIGIN="${STRATOWEAVE_HTTP_ORIGIN:-http://localhost:15000}"

echo "Using StratoWeave at: $STRATOWEAVE_HTTP_ORIGIN"

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
    curl -f -X PATCH \
        -H "Content-Type: application/yang-data+xml" \
        -H "Async: true" \
        -d @/tmp/temp-config.xml \
        "${STRATOWEAVE_HTTP_ORIGIN}/restconf/data"
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
