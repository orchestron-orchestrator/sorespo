// NETCONF-style <config> payloads shown as queue-item and log diffs. XmlDiff
// renders elements carrying operation="remove|delete" red and everything else
// green, so builders that model a removal set xc:operation on the subtree.

const XC = 'xmlns:xc="urn:ietf:params:xml:ns:netconf:base:1.0"';

export function vrfAddDiff(
  vpnId: string,
  iface: string,
  providerAddress: string,
  prefixLength: number,
  asn: number
): string {
  return `<config ${XC}>
  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${iface.split('.')[0]}</name>
    <subinterface>
      <index>${iface.split('.')[1] ?? '0'}</index>
      <ipv4>
        <address>
          <ip-prefix>${providerAddress}/${prefixLength}</ip-prefix>
        </address>
      </ipv4>
    </subinterface>
  </interface>
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>${vpnId}</name>
    <type>ip-vrf</type>
    <interface>
      <name>${iface}</name>
    </interface>
    <protocols>
      <bgp>
        <autonomous-system>${asn}</autonomous-system>
        <group>
          <group-name>customer</group-name>
          <peer-as>${asn}</peer-as>
        </group>
      </bgp>
    </protocols>
  </network-instance>
</config>`;
}

export function vrfRemoveDiff(vpnId: string, iface: string): string {
  return `<config ${XC}>
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance" xc:operation="remove">
    <name>${vpnId}</name>
    <interface>
      <name>${iface}</name>
    </interface>
  </network-instance>
</config>`;
}

export function interfaceDescriptionDiff(iface: string, description: string): string {
  return `<config ${XC}>
  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${iface}</name>
    <description>${description}</description>
  </interface>
</config>`;
}

export function subinterfaceRemoveDiff(iface: string, index: string): string {
  return `<config ${XC}>
  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${iface}</name>
    <subinterface xc:operation="remove">
      <index>${index}</index>
    </subinterface>
  </interface>
</config>`;
}

export function backboneInterfaceDiff(iface: string, peer: string, peerInterface: string): string {
  return `<config ${XC}>
  <interface xmlns="urn:nokia.com:srlinux:chassis:interfaces">
    <name>${iface}</name>
    <description>backbone to ${peer} ${peerInterface}</description>
    <admin-state>enable</admin-state>
  </interface>
</config>`;
}

export function bgpAuthKeyDiff(): string {
  return `<config ${XC}>
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>default</name>
    <protocols>
      <bgp>
        <group>
          <group-name>ibgp</group-name>
          <authentication>
            <keychain>ibgp-authentication-key</keychain>
          </authentication>
        </group>
      </bgp>
    </protocols>
  </network-instance>
</config>`;
}

export function baseRouterDiff(name: string, id: number, asn: number): string {
  return `<config ${XC}>
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
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>default</name>
    <protocols>
      <bgp>
        <autonomous-system>${asn}</autonomous-system>
        <router-id>10.0.0.${id}</router-id>
      </bgp>
    </protocols>
  </network-instance>
</config>`;
}

export function genericApplyDiff(): string {
  return `<config ${XC}>
  <network-instance xmlns="urn:nokia.com:srlinux:net-inst:network-instance">
    <name>default</name>
    <protocols>
      <bgp>
        <group>
          <group-name>ibgp</group-name>
        </group>
      </bgp>
    </protocols>
  </network-instance>
</config>`;
}
