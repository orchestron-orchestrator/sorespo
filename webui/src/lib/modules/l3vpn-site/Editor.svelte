<script lang="ts">
  import FieldCheckbox from '$lib/core/ui/FieldCheckbox.svelte';
  import FieldNumber from '$lib/core/ui/FieldNumber.svelte';
  import FieldSelect from '$lib/core/ui/FieldSelect.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import ListEditor from '$lib/core/ui/ListEditor.svelte';
  import Section from '$lib/core/ui/Section.svelte';
  import {
    createL3VpnSiteAccessDraft,
    createL3VpnSiteDeviceDraft,
    createL3VpnSiteLanPrefixDraft,
    createL3VpnSiteLocationDraft,
    createL3VpnSiteRoutingProtocolDraft
  } from '$lib/modules/l3vpn-site/defaults';
  import {
    L3VPN_SITE_ACCESS_TYPE_OPTIONS,
    L3VPN_SITE_ADDRESS_FAMILY_OPTIONS,
    L3VPN_SITE_MANAGEMENT_OPTIONS,
    L3VPN_SITE_ROUTING_PROTOCOL_OPTIONS,
    formatL3VpnSiteRoutingProtocolType
  } from '$lib/modules/l3vpn-site/model';

  import type {
    L3VpnSiteAccessDraft,
    L3VpnSiteAddressFamily,
    L3VpnSiteDeviceDraft,
    L3VpnSiteDraft,
    L3VpnSiteLanPrefixDraft,
    L3VpnSiteLocationDraft,
    L3VpnSiteRoutingProtocolDraft,
    L3VpnSiteRoutingProtocolType
  } from '$lib/modules/l3vpn-site/model';

  interface Props {
    draft: L3VpnSiteDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: L3VpnSiteDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  type StaticLanPrefixField = 'staticIpv4LanPrefixes' | 'staticIpv6LanPrefixes';

  const STATIC_LAN_PREFIX_FAMILIES: {
    key: StaticLanPrefixField;
    label: string;
    yangPath: string;
    lanPlaceholder: string;
    lanYangType: string;
    nextHopPlaceholder: string;
    nextHopYangType: string;
  }[] = [
    {
      key: 'staticIpv4LanPrefixes',
      label: 'IPv4',
      yangPath: 'static/cascaded-lan-prefixes/ipv4-lan-prefixes',
      lanPlaceholder: 'e.g., 192.0.2.0/24',
      lanYangType: 'inet:ipv4-prefix',
      nextHopPlaceholder: 'e.g., 10.201.1.2',
      nextHopYangType: 'inet:ipv4-address'
    },
    {
      key: 'staticIpv6LanPrefixes',
      label: 'IPv6',
      yangPath: 'static/cascaded-lan-prefixes/ipv6-lan-prefixes',
      lanPlaceholder: 'e.g., 2001:db8::/64',
      lanYangType: 'inet:ipv6-prefix',
      nextHopPlaceholder: 'e.g., 2001:db8::2',
      nextHopYangType: 'inet:ipv6-address'
    }
  ];

  function lanPrefixPatch(
    key: StaticLanPrefixField,
    prefixes: L3VpnSiteLanPrefixDraft[]
  ): Partial<L3VpnSiteRoutingProtocolDraft> {
    return { [key]: prefixes };
  }

  function emit(next: L3VpnSiteDraft): void {
    onchange?.(next);
  }

  function touch(): void {
    ontouch?.();
  }

  function replaceAt<T>(items: T[], index: number, nextItem: T): T[] {
    return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
  }

  function removeAt<T>(items: T[], index: number): T[] {
    return items.filter((_, itemIndex) => itemIndex !== index);
  }

  function errorFor(path: string): string {
    return errors[path] ?? '';
  }

  function patch(values: Partial<L3VpnSiteDraft>): void {
    emit({
      ...draft,
      ...values
    });
  }

  function updateLocation(index: number, values: Partial<L3VpnSiteLocationDraft>): void {
    patch({
      locations: replaceAt(draft.locations, index, {
        ...draft.locations[index],
        ...values
      })
    });
  }

  function updateDevice(index: number, values: Partial<L3VpnSiteDeviceDraft>): void {
    patch({
      devices: replaceAt(draft.devices, index, {
        ...draft.devices[index],
        ...values
      })
    });
  }

  function updateAccess(index: number, values: Partial<L3VpnSiteAccessDraft>): void {
    patch({
      accesses: replaceAt(draft.accesses, index, {
        ...draft.accesses[index],
        ...values
      })
    });
  }

  function updateRoutingProtocol(
    accessIndex: number,
    protocolIndex: number,
    values: Partial<L3VpnSiteRoutingProtocolDraft>
  ): void {
    const access = draft.accesses[accessIndex];
    const nextProtocols = replaceAt(access.routingProtocols, protocolIndex, {
      ...access.routingProtocols[protocolIndex],
      ...values
    });

    updateAccess(accessIndex, {
      routingProtocols: nextProtocols
    });
  }

  function updateLanPrefix(
    accessIndex: number,
    protocolIndex: number,
    family: 'staticIpv4LanPrefixes' | 'staticIpv6LanPrefixes',
    prefixIndex: number,
    values: Partial<L3VpnSiteLanPrefixDraft>
  ): void {
    const access = draft.accesses[accessIndex];
    const protocol = access.routingProtocols[protocolIndex];
    const nextPrefixes = replaceAt(protocol[family], prefixIndex, {
      ...protocol[family][prefixIndex],
      ...values
    });

    updateRoutingProtocol(accessIndex, protocolIndex, {
      [family]: nextPrefixes
    });
  }

  function resetRoutingProtocol(type: L3VpnSiteRoutingProtocolType): L3VpnSiteRoutingProtocolDraft {
    const next = createL3VpnSiteRoutingProtocolDraft();
    next.type = type;

    if (type === 'direct' || type === 'static') {
      next.addressFamilies = [];
    }

    return next;
  }

  function toggleAddressFamily(accessIndex: number, protocolIndex: number, family: L3VpnSiteAddressFamily): void {
    const access = draft.accesses[accessIndex];
    const protocol = access.routingProtocols[protocolIndex];
    const nextFamilies = protocol.addressFamilies.includes(family)
      ? protocol.addressFamilies.filter((item) => item !== family)
      : [...protocol.addressFamilies, family];

    updateRoutingProtocol(accessIndex, protocolIndex, {
      addressFamilies: nextFamilies
    });
    touch();
  }

  let locationReferenceOptions = $derived([
    { value: '', label: 'Select location' },
    ...draft.locations.map((location) => ({
      value: location.locationId,
      label: location.locationId || 'Unnamed location'
    }))
  ]);

  let deviceReferenceOptions = $derived([
    { value: '', label: 'Select device' },
    ...draft.devices.map((device) => ({
      value: device.deviceId,
      label: device.deviceId || 'Unnamed device'
    }))
  ]);

  let deviceManagementAddressFamilyOptions = $derived([
    { value: '', label: 'No management address' },
    ...L3VPN_SITE_ADDRESS_FAMILY_OPTIONS
  ]);
</script>

<div class="editor">
  <Section
    title="Identity"
    description="Top-level site identity and management mode."
    yangPath="ietf-l3vpn-svc:site"
  >
    <div class="editor__grid editor__grid--2col">
      <FieldText
        label="Site ID"
        required={true}
        value={draft.siteId}
        error={errorFor('siteId')}
        {validationKey}
        placeholder="e.g., SITE-1"
        yangType="svc-id (key)"
        mono={true}
        onchange={(value) => patch({ siteId: value })}
        ontouch={touch}
      />
      <FieldSelect
        label="Management type"
        required={true}
        value={draft.managementType}
        options={L3VPN_SITE_MANAGEMENT_OPTIONS}
        error={errorFor('managementType')}
        {validationKey}
        yangType="identityref"
        onchange={(value) => patch({ managementType: value as L3VpnSiteDraft['managementType'] })}
        ontouch={touch}
      />
    </div>
  </Section>

  <Section
    title="Locations"
    description="Repeatable site locations used by the site and customer-managed access references."
    yangPath="ietf-l3vpn-svc:site/locations/location"
  >
    <ListEditor
      title="Site locations"
      description="The YANG model exposes locations as a list; add as many as the site needs."
      items={draft.locations}
      addLabel="Add location"
      emptyLabel="No locations configured."
      getItemLabel={(item, index) => item.locationId || `Location ${index + 1}`}
      onadd={() => patch({ locations: [...draft.locations, createL3VpnSiteLocationDraft()] })}
      onremove={(index) => patch({ locations: removeAt(draft.locations, index) })}
    >
      {#snippet row(item, index)}
        <div class="editor__grid editor__grid--2col">
          <FieldText
            label="Location ID"
            required={true}
            value={item.locationId}
            error={errorFor(`locations.${index}.locationId`)}
            {validationKey}
            placeholder="e.g., MAIN"
            yangType="svc-id"
            mono={true}
            onchange={(value) => updateLocation(index, { locationId: value })}
            ontouch={touch}
          />
          <FieldText
            label="Country code"
            value={item.countryCode}
            error={errorFor(`locations.${index}.countryCode`)}
            {validationKey}
            placeholder="e.g., SI"
            yangType="string"
            help="ISO ALPHA-2 country code."
            mono={true}
            onchange={(value) => updateLocation(index, { countryCode: value.toUpperCase() })}
            ontouch={touch}
          />
          <FieldText
            label="Address"
            value={item.address}
            error={errorFor(`locations.${index}.address`)}
            {validationKey}
            placeholder="Street and number"
            yangType="string"
            onchange={(value) => updateLocation(index, { address: value })}
            ontouch={touch}
          />
          <FieldText
            label="Postal code"
            value={item.postalCode}
            error={errorFor(`locations.${index}.postalCode`)}
            {validationKey}
            placeholder="e.g., 1000"
            yangType="string"
            onchange={(value) => updateLocation(index, { postalCode: value })}
            ontouch={touch}
          />
          <FieldText
            label="State or region"
            value={item.state}
            error={errorFor(`locations.${index}.state`)}
            {validationKey}
            placeholder="Optional region"
            yangType="string"
            onchange={(value) => updateLocation(index, { state: value })}
            ontouch={touch}
          />
          <FieldText
            label="City"
            value={item.city}
            error={errorFor(`locations.${index}.city`)}
            {validationKey}
            placeholder="e.g., Ljubljana"
            yangType="string"
            onchange={(value) => updateLocation(index, { city: value })}
            ontouch={touch}
          />
        </div>
      {/snippet}
    </ListEditor>
  </Section>

  {#if draft.managementType !== 'customer-managed'}
    <Section
      title="Devices"
      description="Provider-managed and co-managed sites can carry a repeatable device list."
      yangPath="ietf-l3vpn-svc:site/devices/device"
    >
      <ListEditor
        title="Site devices"
        description="These entries are referenced by access device references."
        items={draft.devices}
        addLabel="Add device"
        emptyLabel="No devices configured."
        getItemLabel={(item, index) => item.deviceId || `Device ${index + 1}`}
        onadd={() => patch({ devices: [...draft.devices, createL3VpnSiteDeviceDraft()] })}
        onremove={(index) => patch({ devices: removeAt(draft.devices, index) })}
      >
        {#snippet row(item, index)}
          <div class="editor__grid editor__grid--2col">
            <FieldText
              label="Device ID"
              required={true}
              value={item.deviceId}
              error={errorFor(`devices.${index}.deviceId`)}
              {validationKey}
              placeholder="e.g., CE-1"
              yangType="svc-id"
              mono={true}
              onchange={(value) => updateDevice(index, { deviceId: value })}
              ontouch={touch}
            />
            <FieldSelect
              label="Location"
              required={true}
              value={item.location}
              options={locationReferenceOptions}
              error={errorFor(`devices.${index}.location`)}
              {validationKey}
              yangType="leafref"
              onchange={(value) => updateDevice(index, { location: value })}
              ontouch={touch}
            />
            {#if draft.managementType === 'co-managed'}
              <FieldSelect
                label="Management address family"
                value={item.managementAddressFamily}
                options={deviceManagementAddressFamilyOptions}
                error={errorFor(`devices.${index}.managementAddressFamily`)}
                {validationKey}
                yangType="address-family"
                onchange={(value) =>
                  updateDevice(index, {
                    managementAddressFamily: value as L3VpnSiteDeviceDraft['managementAddressFamily']
                  })}
                ontouch={touch}
              />
              <FieldText
                label="Management address"
                value={item.managementAddress}
                error={errorFor(`devices.${index}.managementAddress`)}
                {validationKey}
                placeholder="e.g., 192.0.2.10"
                yangType="inet:ip-address"
                mono={true}
                onchange={(value) => updateDevice(index, { managementAddress: value })}
                ontouch={touch}
              />
            {/if}
          </div>
        {/snippet}
      </ListEditor>

      {#if errorFor('devices')}
        <p class="editor__error">{errorFor('devices')}</p>
      {/if}
    </Section>
  {/if}

  <Section
    title="Site Network Accesses"
    description="Repeatable access entries, each with attachment, addressing, and routing configuration."
    yangPath="ietf-l3vpn-svc:site/site-network-accesses/site-network-access"
  >
    <ListEditor
      title="Accesses"
      description="The editor keeps site-network-access as a real list, not a single collapsed access."
      items={draft.accesses}
      addLabel="Add access"
      emptyLabel="No accesses configured."
      getItemLabel={(item, index) => item.siteNetworkAccessId || `Access ${index + 1}`}
      onadd={() => patch({ accesses: [...draft.accesses, createL3VpnSiteAccessDraft()] })}
      onremove={(index) => patch({ accesses: removeAt(draft.accesses, index) })}
    >
      {#snippet row(item, index)}
        <div class="editor__grid">
          <div class="editor__grid editor__grid--2col">
            <FieldText
              label="Access ID"
              required={true}
              value={item.siteNetworkAccessId}
              error={errorFor(`accesses.${index}.siteNetworkAccessId`)}
              {validationKey}
              placeholder="e.g., SNA-1-1"
              yangType="svc-id"
              mono={true}
              onchange={(value) => updateAccess(index, { siteNetworkAccessId: value })}
              ontouch={touch}
            />
            <FieldSelect
              label="Access type"
              value={item.siteNetworkAccessType}
              options={L3VPN_SITE_ACCESS_TYPE_OPTIONS}
              error={errorFor(`accesses.${index}.siteNetworkAccessType`)}
              {validationKey}
              yangType="identityref"
              onchange={(value) =>
                updateAccess(index, {
                  siteNetworkAccessType: value as L3VpnSiteAccessDraft['siteNetworkAccessType']
                })}
              ontouch={touch}
            />
            {#if draft.managementType === 'customer-managed'}
              <FieldSelect
                label="Location reference"
                required={true}
                value={item.locationReference}
                options={locationReferenceOptions}
                error={errorFor(`accesses.${index}.locationReference`)}
                {validationKey}
                yangType="leafref"
                onchange={(value) => updateAccess(index, { locationReference: value })}
                ontouch={touch}
              />
            {:else}
              <FieldSelect
                label="Device reference"
                required={true}
                value={item.deviceReference}
                options={deviceReferenceOptions}
                error={errorFor(`accesses.${index}.deviceReference`)}
                {validationKey}
                yangType="leafref"
                onchange={(value) => updateAccess(index, { deviceReference: value })}
                ontouch={touch}
              />
            {/if}
            <FieldText
              label="VPN ID"
              required={true}
              value={item.vpnId}
              error={errorFor(`accesses.${index}.vpnId`)}
              {validationKey}
              placeholder="e.g., acme-65501"
              yangType="leafref"
              mono={true}
              onchange={(value) => updateAccess(index, { vpnId: value })}
              ontouch={touch}
            />
          </div>

          <div class="editor__subsection">
            <div class="editor__subsection-header">
              <h6>Service Parameters</h6>
              <span class="editor__yang-path">service/*</span>
            </div>

            <div class="editor__grid editor__grid--3col">
              <FieldText
                label="Input bandwidth"
                value={item.inputBandwidth}
                error={errorFor(`accesses.${index}.inputBandwidth`)}
                {validationKey}
                placeholder="1000000000"
                yangType="string"
                help="Rendered as the raw YANG string used by the sample service."
                mono={true}
                onchange={(value) => updateAccess(index, { inputBandwidth: value })}
                ontouch={touch}
              />
              <FieldText
                label="Output bandwidth"
                value={item.outputBandwidth}
                error={errorFor(`accesses.${index}.outputBandwidth`)}
                {validationKey}
                placeholder="1000000000"
                yangType="string"
                mono={true}
                onchange={(value) => updateAccess(index, { outputBandwidth: value })}
                ontouch={touch}
              />
              <FieldNumber
                label="MTU"
                value={item.mtu}
                error={errorFor(`accesses.${index}.mtu`)}
                {validationKey}
                min={1}
                max={65535}
                yangType="uint16"
                onchange={(value) => updateAccess(index, { mtu: value })}
                ontouch={touch}
              />
            </div>
          </div>

          <div class="editor__subsection">
            <div class="editor__subsection-header">
              <h6>Attachment And Addressing</h6>
              <span class="editor__yang-path">vpn-attachment | ip-connection | bearer</span>
            </div>

            <div class="editor__grid editor__grid--2col">
              <FieldText
                label="Bearer reference"
                value={item.bearerReference}
                error={errorFor(`accesses.${index}.bearerReference`)}
                {validationKey}
                placeholder="e.g., AMS-CORE-1,eth3.100"
                yangType="string"
                mono={true}
                onchange={(value) => updateAccess(index, { bearerReference: value })}
                ontouch={touch}
              />
              <FieldText
                label="Provider IPv4 address"
                value={item.providerAddress}
                error={errorFor(`accesses.${index}.providerAddress`)}
                {validationKey}
                placeholder="e.g., 10.201.1.1"
                yangType="inet:ipv4-address"
                mono={true}
                onchange={(value) => updateAccess(index, { providerAddress: value })}
                ontouch={touch}
              />
              <FieldText
                label="Customer IPv4 address"
                value={item.customerAddress}
                error={errorFor(`accesses.${index}.customerAddress`)}
                {validationKey}
                placeholder="e.g., 10.201.1.2"
                yangType="inet:ipv4-address"
                mono={true}
                onchange={(value) => updateAccess(index, { customerAddress: value })}
                ontouch={touch}
              />
              <FieldNumber
                label="Prefix length"
                value={item.prefixLength}
                error={errorFor(`accesses.${index}.prefixLength`)}
                {validationKey}
                min={0}
                max={32}
                yangType="uint8"
                onchange={(value) => updateAccess(index, { prefixLength: value })}
                ontouch={touch}
              />
            </div>
          </div>

          <div class="editor__subsection">
            <div class="editor__subsection-header">
              <h6>Routing Protocols</h6>
              <span class="editor__yang-path">routing-protocols/routing-protocol</span>
            </div>

            <ListEditor
              title="Routing protocol list"
              description="The YANG list is keyed by protocol type, so each type should appear at most once per access."
              items={item.routingProtocols}
              addLabel="Add protocol"
              emptyLabel="No routing protocols configured."
              getItemLabel={(protocol, protocolIndex) =>
                formatL3VpnSiteRoutingProtocolType(protocol.type) || `Protocol ${protocolIndex + 1}`}
              onadd={() =>
                updateAccess(index, {
                  routingProtocols: [...item.routingProtocols, createL3VpnSiteRoutingProtocolDraft()]
                })}
              onremove={(protocolIndex) =>
                updateAccess(index, {
                  routingProtocols: removeAt(item.routingProtocols, protocolIndex)
                })}
            >
              {#snippet row(protocol, protocolIndex)}
                <div class="editor__grid">
                  <div class="editor__grid editor__grid--2col">
                    <FieldSelect
                      label="Protocol type"
                      value={protocol.type}
                      options={L3VPN_SITE_ROUTING_PROTOCOL_OPTIONS}
                      error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.type`)}
                      {validationKey}
                      yangType="identityref"
                      onchange={(value) =>
                        updateRoutingProtocol(index, protocolIndex, resetRoutingProtocol(value as L3VpnSiteRoutingProtocolType))}
                      ontouch={touch}
                    />

                    {#if protocol.type === 'bgp'}
                      <FieldNumber
                        label="BGP autonomous system"
                        required={true}
                        value={protocol.bgpAutonomousSystem}
                        error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.bgpAutonomousSystem`)}
                        {validationKey}
                        min={1}
                        max={4294967295}
                        yangType="uint32"
                        onchange={(value) =>
                          updateRoutingProtocol(index, protocolIndex, {
                            bgpAutonomousSystem: value
                          })}
                        ontouch={touch}
                      />

                      <FieldText
                        label="Authentication key"
                        value={protocol.bgpAuthenticationKey}
                        error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.bgpAuthenticationKey`)}
                        {validationKey}
                        placeholder="Optional MD5/TCP-AO session key"
                        yangType="string"
                        mono={true}
                        onchange={(value) =>
                          updateRoutingProtocol(index, protocolIndex, {
                            bgpAuthenticationKey: value
                          })}
                        ontouch={touch}
                      />
                    {:else if protocol.type === 'ospf'}
                      <FieldText
                        label="OSPF area address"
                        required={true}
                        value={protocol.ospfAreaAddress}
                        error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.ospfAreaAddress`)}
                        {validationKey}
                        placeholder="e.g., 0.0.0.0"
                        yangType="yang:dotted-quad"
                        mono={true}
                        onchange={(value) =>
                          updateRoutingProtocol(index, protocolIndex, {
                            ospfAreaAddress: value
                          })}
                        ontouch={touch}
                      />
                    {/if}
                  </div>

                  {#if protocol.type === 'ospf'}
                    <div class="editor__grid editor__grid--2col">
                      <FieldNumber
                        label="OSPF metric"
                        value={protocol.ospfMetric}
                        error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.ospfMetric`)}
                        {validationKey}
                        min={0}
                        max={65535}
                        yangType="uint16"
                        onchange={(value) =>
                          updateRoutingProtocol(index, protocolIndex, {
                            ospfMetric: value
                          })}
                        ontouch={touch}
                      />
                    </div>
                  {/if}

                  {#if protocol.type === 'bgp' || protocol.type === 'ospf' || protocol.type === 'rip' || protocol.type === 'vrrp'}
                    <div class="editor__group">
                      <div class="editor__group-header">
                        <strong>Address families</strong>
                        <span class="editor__group-meta">leaf-list address-family</span>
                      </div>

                      <div class="editor__toggle-grid">
                        {#each L3VPN_SITE_ADDRESS_FAMILY_OPTIONS as familyOption}
                          <FieldCheckbox
                            label={familyOption.label}
                            checked={protocol.addressFamilies.includes(familyOption.value as L3VpnSiteAddressFamily)}
                            onchange={() =>
                              toggleAddressFamily(index, protocolIndex, familyOption.value as L3VpnSiteAddressFamily)}
                          />
                        {/each}
                      </div>

                      {#if errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.addressFamilies`)}
                        <p class="editor__error">
                          {errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.addressFamilies`)}
                        </p>
                      {/if}
                    </div>
                  {/if}

                  {#if protocol.type === 'static'}
                    {#each STATIC_LAN_PREFIX_FAMILIES as family}
                      <div class="editor__subsection">
                        <div class="editor__subsection-header">
                          <h6>Static {family.label} LAN Prefixes</h6>
                          <span class="editor__yang-path">{family.yangPath}</span>
                        </div>

                        <ListEditor
                          title={`${family.label} LAN prefixes`}
                          description="Repeatable static LAN prefix rows."
                          items={protocol[family.key]}
                          addLabel={`Add ${family.label} prefix`}
                          emptyLabel={`No ${family.label} LAN prefixes configured.`}
                          getItemLabel={(prefix, prefixIndex) =>
                            prefix.lan || `${family.label} prefix ${prefixIndex + 1}`}
                          onadd={() =>
                            updateRoutingProtocol(
                              index,
                              protocolIndex,
                              lanPrefixPatch(family.key, [
                                ...protocol[family.key],
                                createL3VpnSiteLanPrefixDraft()
                              ])
                            )}
                          onremove={(prefixIndex) =>
                            updateRoutingProtocol(
                              index,
                              protocolIndex,
                              lanPrefixPatch(family.key, removeAt(protocol[family.key], prefixIndex))
                            )}
                        >
                          {#snippet row(prefix, prefixIndex)}
                            <div class="editor__grid editor__grid--3col">
                              <FieldText
                                label="LAN prefix"
                                value={prefix.lan}
                                error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.${family.key}.${prefixIndex}.lan`)}
                                {validationKey}
                                placeholder={family.lanPlaceholder}
                                yangType={family.lanYangType}
                                mono={true}
                                onchange={(value) =>
                                  updateLanPrefix(index, protocolIndex, family.key, prefixIndex, {
                                    lan: value
                                  })}
                                ontouch={touch}
                              />
                              <FieldText
                                label="LAN tag"
                                value={prefix.lanTag}
                                error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.${family.key}.${prefixIndex}.lanTag`)}
                                {validationKey}
                                placeholder="Optional policy tag"
                                yangType="string"
                                onchange={(value) =>
                                  updateLanPrefix(index, protocolIndex, family.key, prefixIndex, {
                                    lanTag: value
                                  })}
                                ontouch={touch}
                              />
                              <FieldText
                                label="Next hop"
                                value={prefix.nextHop}
                                error={errorFor(`accesses.${index}.routingProtocols.${protocolIndex}.${family.key}.${prefixIndex}.nextHop`)}
                                {validationKey}
                                placeholder={family.nextHopPlaceholder}
                                yangType={family.nextHopYangType}
                                mono={true}
                                onchange={(value) =>
                                  updateLanPrefix(index, protocolIndex, family.key, prefixIndex, {
                                    nextHop: value
                                  })}
                                ontouch={touch}
                              />
                            </div>
                          {/snippet}
                        </ListEditor>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/snippet}
            </ListEditor>
          </div>
        </div>
      {/snippet}
    </ListEditor>
  </Section>
</div>

<style>
  .editor {
    display: grid;
    gap: 20px;
  }

  .editor__grid {
    display: grid;
    gap: 16px;
  }

  .editor__grid--2col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor__grid--3col {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .editor__subsection {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
  }

  .editor__subsection-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .editor__subsection-header h6 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--sw-text-primary);
  }

  .editor__yang-path {
    font-family: var(--sw-font-mono);
    font-size: 10px;
    color: var(--sw-text-muted);
    background: var(--sw-bg-deep);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .editor__group {
    display: grid;
    gap: 10px;
  }

  .editor__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .editor__group-header strong {
    font-size: 12px;
  }

  .editor__group-meta {
    font-size: 11px;
    color: var(--sw-text-muted);
    font-family: var(--sw-font-mono);
  }

  .editor__toggle-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor__error {
    margin: 0;
    font-size: 11px;
    color: var(--sw-danger);
  }

  @media (max-width: 980px) {
    .editor__grid--3col {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .editor__grid--2col,
    .editor__grid--3col,
    .editor__toggle-grid {
      grid-template-columns: 1fr;
    }

    .editor__subsection-header,
    .editor__group-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
