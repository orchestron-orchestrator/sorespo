import {
  deviceConfigAdata,
  deviceConfigObject,
  deviceConfigXml
} from '$lib/demo/fixtures/device-configs';

// Blobs for /layer/{0..3}: the CFS → Intermediate → RFS → Device
// transformation chain. Layer 0 (JSON) and layer 3 are rendered live from the
// demo state so edits show up when re-inspecting; the intermediate layers are
// representative static content.

export interface LayerContext {
  /** Wrapped CFS payloads exactly as served over RESTCONF. */
  netinfra: Record<string, unknown>;
  l3vpn: Record<string, unknown>;
  /** Managed routers, for the per-device layers. */
  routers: { name: string; id: number }[];
}

const LAYER1_XML = `<intermediate xmlns="urn:sorespo:inter">
  <router>
    <name>AMS-CORE-1</name>
    <loopback>10.0.0.1</loopback>
    <ibgp-peer>10.0.0.2</ibgp-peer>
    <ibgp-peer>10.0.0.3</ibgp-peer>
    <ibgp-peer>10.0.0.4</ibgp-peer>
  </router>
  <router>
    <name>FRA-CORE-1</name>
    <loopback>10.0.0.2</loopback>
    <ibgp-peer>10.0.0.1</ibgp-peer>
    <ibgp-peer>10.0.0.3</ibgp-peer>
    <ibgp-peer>10.0.0.4</ibgp-peer>
  </router>
  <router>
    <name>STO-CORE-1</name>
    <loopback>10.0.0.3</loopback>
    <ibgp-peer>10.0.0.1</ibgp-peer>
    <ibgp-peer>10.0.0.2</ibgp-peer>
    <ibgp-peer>10.0.0.4</ibgp-peer>
  </router>
  <router>
    <name>LJU-CORE-1</name>
    <loopback>10.0.0.4</loopback>
    <ibgp-peer>10.0.0.1</ibgp-peer>
    <ibgp-peer>10.0.0.2</ibgp-peer>
    <ibgp-peer>10.0.0.3</ibgp-peer>
  </router>
  <l3vpn>
    <vpn-id>acme-65501</vpn-id>
    <endpoint><router>AMS-CORE-1</router><site>SITE-1</site></endpoint>
    <endpoint><router>FRA-CORE-1</router><site>SITE-2</site></endpoint>
    <endpoint><router>STO-CORE-1</router><site>SITE-3</site></endpoint>
    <endpoint><router>LJU-CORE-1</router><site>SITE-4</site></endpoint>
  </l3vpn>
  <l3vpn>
    <vpn-id>globex-65502</vpn-id>
    <endpoint><router>AMS-CORE-1</router><site>SITE-5</site></endpoint>
    <endpoint><router>STO-CORE-1</router><site>SITE-6</site></endpoint>
  </l3vpn>
</intermediate>`;

const LAYER1_JSON = JSON.stringify(
  {
    'inter:intermediate': {
      router: [1, 2, 3, 4].map((id) => ({
        name: ['AMS-CORE-1', 'FRA-CORE-1', 'STO-CORE-1', 'LJU-CORE-1'][id - 1],
        loopback: `10.0.0.${id}`,
        'ibgp-peer': [1, 2, 3, 4].filter((peer) => peer !== id).map((peer) => `10.0.0.${peer}`)
      })),
      l3vpn: [
        {
          'vpn-id': 'acme-65501',
          endpoint: [
            { router: 'AMS-CORE-1', site: 'SITE-1' },
            { router: 'FRA-CORE-1', site: 'SITE-2' },
            { router: 'STO-CORE-1', site: 'SITE-3' },
            { router: 'LJU-CORE-1', site: 'SITE-4' }
          ]
        },
        {
          'vpn-id': 'globex-65502',
          endpoint: [
            { router: 'AMS-CORE-1', site: 'SITE-5' },
            { router: 'STO-CORE-1', site: 'SITE-6' }
          ]
        }
      ]
    }
  },
  null,
  2
);

const LAYER1_ADATA = `intermediate {
    router AMS-CORE-1 { loopback: 10.0.0.1, ibgp-peers: [10.0.0.2, 10.0.0.3, 10.0.0.4] }
    router FRA-CORE-1 { loopback: 10.0.0.2, ibgp-peers: [10.0.0.1, 10.0.0.3, 10.0.0.4] }
    router STO-CORE-1 { loopback: 10.0.0.3, ibgp-peers: [10.0.0.1, 10.0.0.2, 10.0.0.4] }
    router LJU-CORE-1 { loopback: 10.0.0.4, ibgp-peers: [10.0.0.1, 10.0.0.2, 10.0.0.3] }
    l3vpn acme-65501 { endpoints: [AMS-CORE-1/SITE-1, FRA-CORE-1/SITE-2, STO-CORE-1/SITE-3, LJU-CORE-1/SITE-4] }
    l3vpn globex-65502 { endpoints: [AMS-CORE-1/SITE-5, STO-CORE-1/SITE-6] }
}`;

const LAYER2_XML = `<rfs xmlns="urn:sorespo:rfs">
  <device>
    <name>AMS-CORE-1</name>
    <service><type>base-router</type><instance>AMS-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>vrf</type><instance>acme-65501</instance></service>
    <service><type>vrf</type><instance>globex-65502</instance></service>
  </device>
  <device>
    <name>FRA-CORE-1</name>
    <service><type>base-router</type><instance>FRA-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/3</instance></service>
    <service><type>vrf</type><instance>acme-65501</instance></service>
  </device>
  <device>
    <name>STO-CORE-1</name>
    <service><type>base-router</type><instance>STO-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/3</instance></service>
    <service><type>vrf</type><instance>acme-65501</instance></service>
    <service><type>vrf</type><instance>globex-65502</instance></service>
  </device>
  <device>
    <name>LJU-CORE-1</name>
    <service><type>base-router</type><instance>LJU-CORE-1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/1</instance></service>
    <service><type>backbone-interface</type><instance>ethernet-1/2</instance></service>
    <service><type>vrf</type><instance>acme-65501</instance></service>
  </device>
</rfs>`;

const LAYER2_JSON = JSON.stringify(
  {
    'rfs:rfs': {
      device: [
        {
          name: 'AMS-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'vrf acme-65501', 'vrf globex-65502']
        },
        {
          name: 'FRA-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'backbone-interface ethernet-1/3', 'vrf acme-65501']
        },
        {
          name: 'STO-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'backbone-interface ethernet-1/3', 'vrf acme-65501', 'vrf globex-65502']
        },
        {
          name: 'LJU-CORE-1',
          service: ['base-router', 'backbone-interface ethernet-1/1', 'backbone-interface ethernet-1/2', 'vrf acme-65501']
        }
      ]
    }
  },
  null,
  2
);

const LAYER2_ADATA = `rfs {
    device AMS-CORE-1 { base-router, backbone-interface x2, vrf acme-65501, vrf globex-65502 }
    device FRA-CORE-1 { base-router, backbone-interface x3, vrf acme-65501 }
    device STO-CORE-1 { base-router, backbone-interface x3, vrf acme-65501, vrf globex-65502 }
    device LJU-CORE-1 { base-router, backbone-interface x2, vrf acme-65501 }
}`;

const LAYER0_XML = `<data>
  <netinfra xmlns="urn:sorespo:netinfra">
    <global-settings>
      <ibgp-authentication-key>ibgp-authentication-key</ibgp-authentication-key>
    </global-settings>
    <router><name>AMS-CORE-1</name><id>1</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>FRA-CORE-1</name><id>2</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>STO-CORE-1</name><id>3</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <router><name>LJU-CORE-1</name><id>4</id><type>NokiaSRLinux_25_3_2</type><role>edge</role><asn>65001</asn></router>
    <backbone-link><left-router>AMS-CORE-1</left-router><left-interface>ethernet-1/1</left-interface><right-router>FRA-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>AMS-CORE-1</left-router><left-interface>ethernet-1/2</left-interface><right-router>STO-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>FRA-CORE-1</left-router><left-interface>ethernet-1/2</left-interface><right-router>STO-CORE-1</right-router><right-interface>ethernet-1/2</right-interface></backbone-link>
    <backbone-link><left-router>FRA-CORE-1</left-router><left-interface>ethernet-1/3</left-interface><right-router>LJU-CORE-1</right-router><right-interface>ethernet-1/1</right-interface></backbone-link>
    <backbone-link><left-router>STO-CORE-1</left-router><left-interface>ethernet-1/3</left-interface><right-router>LJU-CORE-1</right-router><right-interface>ethernet-1/2</right-interface></backbone-link>
  </netinfra>
  <l3vpn-svc xmlns="urn:ietf:params:xml:ns:yang:ietf-l3vpn-svc">
    <vpn-services>
      <vpn-service><vpn-id>acme-65501</vpn-id><customer-name>CUSTOMER-1</customer-name></vpn-service>
      <vpn-service><vpn-id>globex-65502</vpn-id><customer-name>GLOBEX</customer-name></vpn-service>
    </vpn-services>
    <sites>
      <site><site-id>SITE-1</site-id><!-- AMS-CORE-1,ethernet-1/3.100 · acme-65501 --></site>
      <site><site-id>SITE-2</site-id><!-- FRA-CORE-1,ethernet-1/4.100 · acme-65501 --></site>
      <site><site-id>SITE-3</site-id><!-- STO-CORE-1,ethernet-1/4.100 · acme-65501 --></site>
      <site><site-id>SITE-4</site-id><!-- LJU-CORE-1,ethernet-1/3.100 · acme-65501 --></site>
      <site><site-id>SITE-5</site-id><!-- AMS-CORE-1,ethernet-1/5.200 · globex-65502 --></site>
      <site><site-id>SITE-6</site-id><!-- STO-CORE-1,ethernet-1/5.200 · globex-65502 --></site>
    </sites>
  </l3vpn-svc>
</data>`;

const LAYER0_ADATA = `cfs {
    netinfra {
        global-settings { ibgp-authentication-key: "***" }
        routers: [AMS-CORE-1, FRA-CORE-1, STO-CORE-1, LJU-CORE-1]
        backbone-links: 5
    }
    l3vpn-svc {
        vpn-service acme-65501 { customer: CUSTOMER-1, sites: [SITE-1, SITE-2, SITE-3, SITE-4] }
        vpn-service globex-65502 { customer: GLOBEX, sites: [SITE-5, SITE-6] }
    }
}`;

export function layerConfigText(layer: number, format: string, ctx: LayerContext): string {
  if (layer === 0) {
    if (format === 'json') {
      return JSON.stringify({ ...ctx.netinfra, ...ctx.l3vpn }, null, 2);
    }
    if (format === 'adata') {
      return LAYER0_ADATA;
    }
    return LAYER0_XML;
  }

  if (layer === 1) {
    if (format === 'json') return LAYER1_JSON;
    if (format === 'adata') return LAYER1_ADATA;
    return LAYER1_XML;
  }

  if (layer === 2) {
    if (format === 'json') return LAYER2_JSON;
    if (format === 'adata') return LAYER2_ADATA;
    return LAYER2_XML;
  }

  // Layer 3: the fully rendered per-device configuration.
  if (format === 'json') {
    const devices: Record<string, unknown> = {};
    for (const router of ctx.routers) {
      devices[router.name] = deviceConfigObject(router.name, router.id);
    }
    return JSON.stringify({ 'device-config:devices': devices }, null, 2);
  }
  if (format === 'adata') {
    return ctx.routers
      .map((router) => `device ${router.name} {\n${deviceConfigAdata(router.name, router.id)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')}\n}`)
      .join('\n');
  }
  return `<devices>\n${ctx.routers
    .map((router) => `  <device>\n    <name>${router.name}</name>\n${deviceConfigXml(router.name, router.id)
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n')}\n  </device>`)
    .join('\n')}\n</devices>`;
}
