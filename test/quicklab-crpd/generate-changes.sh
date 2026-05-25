#!/bin/bash
# Generate config changes for testing the approval queue

if [ -z "$STRATOWEAVE_API_ORIGIN" ]; then
    port=$(docker port sorespo-quicklab-crpd-sweave 80/tcp 2>/dev/null | sed -n 's/.*:\([0-9][0-9]*\)$/\1/p' | head -n 1)
    if [ -z "$port" ]; then
        echo "Error: sorespo-quicklab-crpd-sweave is not running or port 80 is not published; start the lab first or export STRATOWEAVE_API_ORIGIN" >&2
        exit 1
    fi
    STRATOWEAVE_API_ORIGIN="http://localhost:$port"
fi

echo "Using StratoWeave at: $STRATOWEAVE_API_ORIGIN"

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
        "${STRATOWEAVE_API_ORIGIN}/restconf/data"
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
