// L3VPN service data modeled on test/quicklab-srl/l3vpn-svc.json: the
// quicklab's acme-65501 VPN with SITE-1..4 (one per core router) plus a second
// globex-65502 VPN so the lists, topology overlay and command palette have
// more than one of everything.

export const L3VPN_VPN_SERVICES: Record<string, any>[] = [
  { 'vpn-id': 'acme-65501', 'customer-name': 'CUSTOMER-1' },
  { 'vpn-id': 'globex-65502', 'customer-name': 'GLOBEX' }
];

interface BgpSessionFixture {
  'session-state': string;
  'debug-active': boolean;
  'last-event'?: string;
  'established-transitions'?: number;
  'negotiated-hold-time'?: number;
  'last-notification'?: string;
}

const ESTABLISHED_BGP_SESSION: BgpSessionFixture = {
  'session-state': 'established',
  'debug-active': false
};

const ESCALATED_BGP_SESSION: BgpSessionFixture = {
  'session-state': 'active',
  'debug-active': true,
  'last-event': 'error',
  'established-transitions': 3,
  'negotiated-hold-time': 3,
  'last-notification': 'received:cease'
};

function makeSite(
  siteId: string,
  accessId: string,
  bearerReference: string,
  network: string,
  vpnId: string,
  asn: number,
  bgpSession: BgpSessionFixture = ESTABLISHED_BGP_SESSION
): Record<string, any> {
  return {
    'site-id': siteId,
    management: { type: 'customer-managed' },
    locations: { location: [{ 'location-id': 'MAIN' }] },
    'site-network-accesses': {
      'site-network-access': [
        {
          'site-network-access-id': accessId,
          'location-reference': 'MAIN',
          service: {
            'svc-input-bandwidth': '1000000000',
            'svc-output-bandwidth': '1000000000',
            'svc-mtu': 9000
          },
          'vpn-attachment': { 'vpn-id': vpnId },
          'ip-connection': {
            ipv4: {
              'address-allocation-type': 'static-address',
              addresses: {
                'provider-address': `${network}.1`,
                'customer-address': `${network}.2`,
                'prefix-length': 30
              }
            }
          },
          bearer: { 'bearer-reference': bearerReference },
          'routing-protocols': {
            'routing-protocol': [
              {
                type: 'bgp',
                bgp: {
                  'autonomous-system': asn,
                  'address-family': ['ipv4'],
                  'sorespo-ietf-l3vpn-svc:authentication-key': vpnId
                }
              }
            ]
          }
        }
      ]
    },
    'sorespo-ietf-l3vpn-svc:bgp-sessions': {
      'bgp-session': [
        {
          'site-network-access': accessId,
          ...bgpSession
        }
      ]
    }
  };
}

export const L3VPN_SITES: Record<string, any>[] = [
  makeSite('SITE-1', 'SNA-1-1', 'AMS-CORE-1,ethernet-1/3.100', '10.201.1', 'acme-65501', 65501),
  makeSite('SITE-2', 'SNA-2-1', 'FRA-CORE-1,ethernet-1/4.100', '10.202.1', 'acme-65501', 65501),
  makeSite(
    'SITE-3',
    'SNA-3-1',
    'STO-CORE-1,ethernet-1/4.100',
    '10.203.1',
    'acme-65501',
    65501,
    ESCALATED_BGP_SESSION
  ),
  makeSite('SITE-4', 'SNA-4-1', 'LJU-CORE-1,ethernet-1/3.100', '10.204.1', 'acme-65501', 65501),
  makeSite('SITE-5', 'SNA-5-1', 'AMS-CORE-1,ethernet-1/5.200', '10.205.1', 'globex-65502', 65502),
  makeSite('SITE-6', 'SNA-6-1', 'STO-CORE-1,ethernet-1/5.200', '10.206.1', 'globex-65502', 65502)
];
