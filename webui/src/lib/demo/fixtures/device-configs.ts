// Per-device running/target configuration blobs for the /device/{id}/running,
// /target and /diff endpoints. One network table drives the XML, JSON and
// AData renderings so all formats tell the same story, consistent with the
// netinfra/l3vpn fixtures (backbone p2p /30s, one VRF per attached site).

interface BackboneIface {
  name: string;
  description: string;
  prefix: string;
}

interface VrfAttachment {
  vpnId: string;
  iface: string;
  providerAddress: string;
  asn: number;
}

interface DeviceNetwork {
  backbone: BackboneIface[];
  vrfs: VrfAttachment[];
}

const DEVICE_NETWORK: Record<string, DeviceNetwork> = {
  'AMS-CORE-1': {
    backbone: [
      { name: 'ethernet-1/1', description: 'backbone to FRA-CORE-1 ethernet-1/1', prefix: '10.1.12.1/30' },
      { name: 'ethernet-1/2', description: 'backbone to STO-CORE-1 ethernet-1/1', prefix: '10.1.13.1/30' }
    ],
    vrfs: [
      { vpnId: 'acme-65501', iface: 'ethernet-1/3.100', providerAddress: '10.201.1.1/30', asn: 65501 },
      { vpnId: 'globex-65502', iface: 'ethernet-1/5.200', providerAddress: '10.205.1.1/30', asn: 65502 }
    ]
  },
  'FRA-CORE-1': {
    backbone: [
      { name: 'ethernet-1/1', description: 'backbone to AMS-CORE-1 ethernet-1/1', prefix: '10.1.12.2/30' },
      { name: 'ethernet-1/2', description: 'backbone to STO-CORE-1 ethernet-1/2', prefix: '10.1.23.1/30' },
      { name: 'ethernet-1/3', description: 'backbone to LJU-CORE-1 ethernet-1/1', prefix: '10.1.24.1/30' }
    ],
    vrfs: [{ vpnId: 'acme-65501', iface: 'ethernet-1/4.100', providerAddress: '10.202.1.1/30', asn: 65501 }]
  },
  'STO-CORE-1': {
    backbone: [
      { name: 'ethernet-1/1', description: 'backbone to AMS-CORE-1 ethernet-1/2', prefix: '10.1.13.2/30' },
      { name: 'ethernet-1/2', description: 'backbone to FRA-CORE-1 ethernet-1/2', prefix: '10.1.23.2/30' },
      { name: 'ethernet-1/3', description: 'backbone to LJU-CORE-1 ethernet-1/2', prefix: '10.1.34.1/30' }
    ],
    vrfs: [
      { vpnId: 'acme-65501', iface: 'ethernet-1/4.100', providerAddress: '10.203.1.1/30', asn: 65501 },
      { vpnId: 'globex-65502', iface: 'ethernet-1/5.200', providerAddress: '10.206.1.1/30', asn: 65502 }
    ]
  },
  'LJU-CORE-1': {
    backbone: [
      { name: 'ethernet-1/1', description: 'backbone to FRA-CORE-1 ethernet-1/3', prefix: '10.1.24.2/30' },
      { name: 'ethernet-1/2', description: 'backbone to STO-CORE-1 ethernet-1/3', prefix: '10.1.34.2/30' }
    ],
    vrfs: [{ vpnId: 'acme-65501', iface: 'ethernet-1/3.100', providerAddress: '10.204.1.1/30', asn: 65501 }]
  }
};

const EMPTY_NETWORK: DeviceNetwork = { backbone: [], vrfs: [] };

function networkFor(name: string): DeviceNetwork {
  return DEVICE_NETWORK[name] ?? EMPTY_NETWORK;
}

function splitIface(iface: string): { port: string; index: string } {
  const [port, index = '0'] = iface.split('.');
  return { port, index };
}

export function deviceConfigXml(name: string, id: number): string {
  const network = networkFor(name);

  const backboneXml = network.backbone
    .map(
      (iface) => `  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${iface.name}</name>
    <description>${iface.description}</description>
    <admin-state>enable</admin-state>
    <subinterface>
      <index>0</index>
      <ipv4>
        <address>
          <ip-prefix>${iface.prefix}</ip-prefix>
        </address>
      </ipv4>
    </subinterface>
  </interface>`
    )
    .join('\n');

  const vrfIfaceXml = network.vrfs
    .map((vrf) => {
      const { port, index } = splitIface(vrf.iface);
      return `  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${port}</name>
    <subinterface>
      <index>${index}</index>
      <vlan>
        <encap>
          <single-tagged>
            <vlan-id>${index}</vlan-id>
          </single-tagged>
        </encap>
      </vlan>
      <ipv4>
        <address>
          <ip-prefix>${vrf.providerAddress}</ip-prefix>
        </address>
      </ipv4>
    </subinterface>
  </interface>`;
    })
    .join('\n');

  const vrfXml = network.vrfs
    .map(
      (vrf) => `  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>${vrf.vpnId}</name>
    <type>ip-vrf</type>
    <interface>
      <name>${vrf.iface}</name>
    </interface>
    <protocols>
      <bgp>
        <autonomous-system>${vrf.asn}</autonomous-system>
        <group>
          <group-name>customer</group-name>
          <peer-as>${vrf.asn}</peer-as>
        </group>
      </bgp>
    </protocols>
  </network-instance>`
    )
    .join('\n');

  return `<config>
  <system xmlns="urn:nokia.com:srlinux:general:system">
    <name>
      <host-name>${name}</host-name>
    </name>
  </system>
  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>system0</name>
    <subinterface>
      <index>0</index>
      <ipv4>
        <address>
          <ip-prefix>10.0.0.${id}/32</ip-prefix>
        </address>
      </ipv4>
    </subinterface>
  </interface>
${backboneXml}
${vrfIfaceXml}
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>default</name>
    <type>default</type>
    <interface>
      <name>system0.0</name>
    </interface>
${network.backbone.map((iface) => `    <interface>\n      <name>${iface.name}.0</name>\n    </interface>`).join('\n')}
    <protocols>
      <bgp>
        <autonomous-system>65001</autonomous-system>
        <router-id>10.0.0.${id}</router-id>
        <group>
          <group-name>ibgp</group-name>
          <peer-as>65001</peer-as>
        </group>
      </bgp>
    </protocols>
  </network-instance>
${vrfXml}
</config>`;
}

export function deviceConfigObject(name: string, id: number): Record<string, unknown> {
  const network = networkFor(name);

  const interfaces: Record<string, unknown>[] = [
    {
      name: 'system0',
      subinterface: [{ index: 0, ipv4: { address: [{ 'ip-prefix': `10.0.0.${id}/32` }] } }]
    },
    ...network.backbone.map((iface) => ({
      name: iface.name,
      description: iface.description,
      'admin-state': 'enable',
      subinterface: [{ index: 0, ipv4: { address: [{ 'ip-prefix': iface.prefix }] } }]
    })),
    ...network.vrfs.map((vrf) => {
      const { port, index } = splitIface(vrf.iface);
      return {
        name: port,
        subinterface: [
          {
            index: Number(index),
            vlan: { encap: { 'single-tagged': { 'vlan-id': Number(index) } } },
            ipv4: { address: [{ 'ip-prefix': vrf.providerAddress }] }
          }
        ]
      };
    })
  ];

  const networkInstances: Record<string, unknown>[] = [
    {
      name: 'default',
      type: 'default',
      interface: [
        { name: 'system0.0' },
        ...network.backbone.map((iface) => ({ name: `${iface.name}.0` }))
      ],
      protocols: {
        bgp: {
          'autonomous-system': 65001,
          'router-id': `10.0.0.${id}`,
          group: [{ 'group-name': 'ibgp', 'peer-as': 65001 }]
        }
      }
    },
    ...network.vrfs.map((vrf) => ({
      name: vrf.vpnId,
      type: 'ip-vrf',
      interface: [{ name: vrf.iface }],
      protocols: {
        bgp: {
          'autonomous-system': vrf.asn,
          group: [{ 'group-name': 'customer', 'peer-as': vrf.asn }]
        }
      }
    }))
  ];

  return {
    'srl_nokia-system:system': { name: { 'host-name': name } },
    'srl_nokia-interfaces:interface': interfaces,
    'srl_nokia-network-instance:network-instance': networkInstances
  };
}

export function deviceConfigAdata(name: string, id: number): string {
  const network = networkFor(name);
  const lines = [
    `system {`,
    `    host-name: "${name}"`,
    `}`,
    `interface system0 {`,
    `    subinterface 0 { ipv4 { address 10.0.0.${id}/32 } }`,
    `}`
  ];
  for (const iface of network.backbone) {
    lines.push(
      `interface ${iface.name} {`,
      `    description: "${iface.description}"`,
      `    subinterface 0 { ipv4 { address ${iface.prefix} } }`,
      `}`
    );
  }
  for (const vrf of network.vrfs) {
    lines.push(
      `network-instance ${vrf.vpnId} {`,
      `    type: ip-vrf`,
      `    interface ${vrf.iface} { }`,
      `    protocols { bgp { autonomous-system: ${vrf.asn} } }`,
      `}`
    );
  }
  lines.push(
    `network-instance default {`,
    `    type: default`,
    `    protocols { bgp { autonomous-system: 65001, router-id: 10.0.0.${id} } }`,
    `}`
  );
  return lines.join('\n');
}

/**
 * Extra configuration present in the target (but not the running) config
 * while a device has pending queue items — keeps the Running/Target viewer
 * honest about "changes waiting for approval".
 */
export function pendingTargetExtraXml(): string {
  return `  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>ethernet-1/6</name>
    <description>pending change awaiting approval</description>
    <admin-state>enable</admin-state>
  </interface>`;
}

export function pendingTargetExtraObject(): Record<string, unknown> {
  return {
    name: 'ethernet-1/6',
    description: 'pending change awaiting approval',
    'admin-state': 'enable'
  };
}
