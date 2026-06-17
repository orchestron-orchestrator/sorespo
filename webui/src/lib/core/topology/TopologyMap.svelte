<script lang="ts">
  import {
    TOPOLOGY_LINK_LABEL_HEIGHT,
    TOPOLOGY_ROUTER_RADIUS,
    TOPOLOGY_SITE_CARD_HEIGHT,
    TOPOLOGY_SITE_CARD_WIDTH
  } from '$lib/core/topology/model';
  import { appHref } from '$lib/core/util/nav';

  import type { TopologyGraph } from '$lib/core/topology/model';

  let { graph, note = '' }: { graph: TopologyGraph; note?: string } = $props();

  const routerRadius = TOPOLOGY_ROUTER_RADIUS;
  const siteCardWidth = TOPOLOGY_SITE_CARD_WIDTH;
  const siteCardHeight = TOPOLOGY_SITE_CARD_HEIGHT;
  const linkLabelHeight = TOPOLOGY_LINK_LABEL_HEIGHT;

  let routerCount = $derived(graph.routers.length);
  let linkCount = $derived(graph.links.length);
  let attachedSiteCount = $derived(
    graph.routers.reduce((count, router) => count + router.attachments.length, 0)
  );
</script>

<div class="topology">
  <div class="topology__summary">
    <span class="pill"><span class="dot"></span>{routerCount} routers</span>
    <span class="pill"><span class="dot"></span>{linkCount} backbone links</span>
    <span class="pill"><span class="dot"></span>{attachedSiteCount} attached site views</span>
    {#if graph.orphanSiteAttachments.length > 0}
      <span class="pill warning"><span class="dot"></span>{graph.orphanSiteAttachments.length} unmapped site attachments</span>
    {/if}
  </div>

  <div class="card topology__canvas-card">
    <div class="card-body topology__canvas-wrap">
      <svg
        class="topology__svg"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        style={`width: ${graph.width}px; height: ${graph.height}px; min-width: 100%;`}
        aria-label="Network topology map"
        role="img"
      >
        <defs>
          <radialGradient id="topology-ring-grad" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stop-color="rgba(34, 211, 238, 0)"></stop>
            <stop offset="85%" stop-color="rgba(34, 211, 238, 0.55)"></stop>
            <stop offset="100%" stop-color="rgba(34, 211, 238, 0)"></stop>
          </radialGradient>
        </defs>

        <g class="topology__links">
          {#each graph.links as link}
            {#if link.geometry}
              {@const geometry = link.geometry}
              {@const deltaX = geometry.rightX - geometry.leftX}
              {@const deltaY = geometry.rightY - geometry.leftY}
              {@const length = Math.hypot(deltaX, deltaY) || 1}
              {@const offsetX = (deltaX / length) * (routerRadius + 4)}
              {@const offsetY = (deltaY / length) * (routerRadius + 4)}
              {@const routeId = `${link.leftRouter},${link.leftInterface},${link.rightRouter},${link.rightInterface}`}
              {@const href = appHref(`/services/netinfra-backbone-link/${encodeURIComponent(routeId)}`)}

              <a {href} class="topology__link-link" aria-label={`Open backbone-link ${link.leftRouter} ${link.leftInterface} ↔ ${link.rightRouter} ${link.rightInterface}, status ${link.linkStatus}`}>
                <line
                  x1={geometry.leftX + offsetX}
                  y1={geometry.leftY + offsetY}
                  x2={geometry.rightX - offsetX}
                  y2={geometry.rightY - offsetY}
                  class="topology__link"
                  class:topology__link--up={link.linkStatus === 'up'}
                  class:topology__link--down={link.linkStatus === 'down'}
                />
                <line
                  x1={geometry.leftX + offsetX}
                  y1={geometry.leftY + offsetY}
                  x2={geometry.rightX - offsetX}
                  y2={geometry.rightY - offsetY}
                  class="topology__link-hit"
                />

                {#if geometry.label}
                  {@const label = geometry.label}
                  <g class="topology__link-label-group" transform={`translate(${label.x}, ${label.y})`}>
                    <rect
                      class="topology__link-label-bg"
                      x={-label.width / 2}
                      y={-linkLabelHeight / 2}
                      width={label.width}
                      height={linkLabelHeight}
                      rx="12"
                    ></rect>
                    <text class="topology__link-label" text-anchor="middle">
                      <tspan x="0" y="-4">{label.interfaceLine}</tspan>
                    </text>
                  </g>
                {/if}
              </a>
            {/if}
          {/each}
        </g>

        <g class="topology__attachment-links">
          {#each graph.routers as router}
            {#each router.attachments as attachment}
              {@const deltaX = attachment.x - router.x}
              {@const deltaY = attachment.y - router.y}
              {@const length = Math.hypot(deltaX, deltaY) || 1}
              {@const unitX = deltaX / length}
              {@const unitY = deltaY / length}
              {@const siteEdgeOffset =
                Math.abs(unitX) * (siteCardWidth / 2) +
                Math.abs(unitY) * (siteCardHeight / 2) -
                6}
              <line
                x1={router.x + unitX * (routerRadius + 4)}
                y1={router.y + unitY * (routerRadius + 4)}
                x2={attachment.x - unitX * siteEdgeOffset}
                y2={attachment.y - unitY * siteEdgeOffset}
                class="topology__attachment-link"
                class:topology__attachment-link--established={attachment.bgpStatus === 'established'}
                class:topology__attachment-link--down={attachment.bgpStatus === 'down'}
              />
            {/each}
          {/each}
        </g>

        <g class="topology__routers">
          {#each graph.routers as router}
            <a href={appHref(`/devices/${encodeURIComponent(router.name)}`)}>
              <g
                class="topology__router"
                class:topology__router--approval={router.approvalRequired}
                transform={`translate(${router.x}, ${router.y})`}
              >
                <circle
                  class="topology__router-ring"
                  r={routerRadius + 12}
                  fill="url(#topology-ring-grad)"
                ></circle>
                <circle class="topology__router-core" r={routerRadius}></circle>
                <circle class="topology__router-core-inner" r={routerRadius - 2}></circle>
                <text class="topology__router-name" text-anchor="middle">
                  <tspan x="0" y="-4">{router.name}</tspan>
                  <tspan x="0" y="14">
                    {router.role || router.type || (router.asn !== null ? `AS${router.asn}` : 'router')}
                  </tspan>
                </text>
              </g>
            </a>
          {/each}
        </g>

        <g class="topology__sites">
          {#each graph.routers as router}
            {#each router.attachments as attachment}
              <a href={appHref(`/services/l3vpn-site/${encodeURIComponent(attachment.siteId)}`)}>
                <g
                  class="topology__site"
                  class:topology__site--established={attachment.bgpStatus === 'established'}
                  class:topology__site--down={attachment.bgpStatus === 'down'}
                  transform={`translate(${attachment.x}, ${attachment.y})`}
                >
                  <title>{attachment.bgpStatus === 'unknown'
                    ? `${attachment.siteId}: no eBGP session`
                    : `${attachment.siteId}: eBGP ${attachment.bgpSessionState ?? attachment.bgpStatus}${attachment.bgpDebugActive ? ' · debug-active — click for escalated detail' : ''}`}</title>
                  <rect
                    class="topology__site-card"
                    x={-siteCardWidth / 2}
                    y={-siteCardHeight / 2}
                    width={siteCardWidth}
                    height={siteCardHeight}
                    rx="12"
                  ></rect>
                  <text class="topology__site-text">
                    <tspan x="0" y="-7">{attachment.siteId}</tspan>
                    <tspan x="0" y="12">
                      {attachment.vpnIds[0] || 'No vpn-id'}
                    </tspan>
                  </text>
                  {#if attachment.bgpDebugActive}
                    <g class="topology__site-debug" transform={`translate(${-siteCardWidth / 2 + 14}, ${-siteCardHeight / 2 + 14})`}>
                      <circle class="topology__site-debug-dot" r="7"></circle>
                      <text class="topology__site-debug-text" text-anchor="middle" dominant-baseline="middle">!</text>
                    </g>
                  {/if}
                  {#if attachment.accessIds.length > 1}
                    <g transform={`translate(${siteCardWidth / 2 - 16}, ${-siteCardHeight / 2 + 14})`}>
                      <circle class="topology__site-count-bg" r="11"></circle>
                      <text class="topology__site-count" text-anchor="middle" dominant-baseline="middle">
                        {attachment.accessIds.length}
                      </text>
                    </g>
                  {/if}
                </g>
              </a>
            {/each}
          {/each}
        </g>
      </svg>
    </div>
  </div>

  {#if graph.orphanSiteAttachments.length > 0}
    <div class="card topology__orphans">
      <div class="card-header">
        <h4>Unmapped Site Attachments</h4>
        <span class="card-badge">{graph.orphanSiteAttachments.length}</span>
      </div>
      <div class="card-body topology__orphan-list">
        {#each graph.orphanSiteAttachments as attachment}
          <a class="topology__orphan-item" href={appHref(`/services/l3vpn-site/${encodeURIComponent(attachment.siteId)}`)}>
            <strong>{attachment.siteId}</strong>
            <span>{attachment.vpnIds[0] || 'No vpn-id'}</span>
            <span>{attachment.routerHint || 'No router hint from bearer-reference'}</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  {#if note}
    <p class="topology__note">{note}</p>
  {/if}
</div>

<style>
  .topology {
    display: grid;
    gap: 14px;
  }

  .topology__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .topology__canvas-card {
    overflow: hidden;
  }

  .topology__canvas-wrap {
    overflow: auto;
    padding: 0;
    background-color: rgba(8, 16, 32, 0.55);
    background-image:
      radial-gradient(600px 320px at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
      linear-gradient(rgba(226, 232, 240, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(226, 232, 240, 0.04) 1px, transparent 1px);
    background-size: auto, 32px 32px, 32px 32px;
  }

  .topology__svg {
    display: block;
    width: auto;
    min-width: 100%;
    max-width: none;
    height: auto;
  }

  .topology__link-link {
    cursor: pointer;
    text-decoration: none;
  }

  .topology__link {
    stroke: rgba(226, 232, 240, 0.20);
    stroke-width: 1.5;
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
    pointer-events: none;
  }

  .topology__link--up {
    stroke: rgba(34, 197, 94, 0.85);
    stroke-width: 2;
  }

  .topology__link--down {
    stroke: rgba(239, 68, 68, 0.9);
    stroke-width: 2;
  }

  .topology__link-hit {
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
  }

  .topology__link-link:hover .topology__link {
    stroke: var(--sw-accent);
    stroke-width: 2.5;
  }

  .topology__link-link:hover .topology__link-label-bg {
    stroke: var(--sw-accent);
  }

  .topology__link-label-bg {
    fill: rgba(8, 16, 32, 0.92);
    stroke: var(--sw-border-default);
    stroke-width: 1;
    transition: stroke 0.15s ease;
  }

  .topology__link-label {
    fill: var(--sw-text-secondary);
    font-size: 11px;
    font-family: var(--sw-font-mono);
    dominant-baseline: middle;
    pointer-events: none;
  }

  .topology__attachment-link {
    stroke: rgba(226, 232, 240, 0.20);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }

  .topology__attachment-link--established {
    stroke: rgba(34, 197, 94, 0.85);
    stroke-width: 1.6;
    stroke-dasharray: none;
  }

  .topology__attachment-link--down {
    stroke: rgba(239, 68, 68, 0.9);
    stroke-width: 1.6;
    stroke-dasharray: none;
  }

  .topology__router {
    cursor: pointer;
  }

  .topology__router-ring {
    stroke: none;
    pointer-events: none;
  }

  .topology__router-core {
    fill: rgba(8, 16, 32, 0.92);
    stroke: var(--sw-accent);
    stroke-width: 1.4;
    transition: transform 0.15s ease, stroke 0.15s ease;
  }

  .topology__router-core-inner {
    fill: none;
    stroke: rgba(34, 211, 238, 0.25);
    stroke-width: 1;
    pointer-events: none;
  }

  .topology__router:hover .topology__router-core {
    transform: scale(1.03);
    stroke: #5ce8fa;
  }

  .topology__router--approval .topology__router-core {
    stroke: var(--sw-warning);
  }

  .topology__router--approval .topology__router-core-inner {
    stroke: rgba(245, 158, 11, 0.25);
  }

  .topology__router-name {
    fill: var(--sw-text-primary);
    text-anchor: middle;
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
  }

  .topology__router-name tspan:last-child {
    fill: var(--sw-text-muted);
    font-size: 10px;
    font-weight: 500;
  }

  .topology__site {
    cursor: pointer;
  }

  .topology__site-card {
    fill: rgba(8, 16, 32, 0.92);
    stroke: var(--sw-violet);
    stroke-width: 1.1;
    transition: stroke 0.15s ease;
  }

  .topology__site:hover .topology__site-card {
    stroke: #a78bfa;
  }

  .topology__site--established .topology__site-card {
    stroke: rgba(34, 197, 94, 0.9);
  }

  .topology__site--down .topology__site-card {
    stroke: rgba(239, 68, 68, 0.95);
    stroke-width: 1.6;
  }

  .topology__site-debug-dot {
    fill: var(--sw-warning);
    stroke: rgba(8, 16, 32, 0.92);
    stroke-width: 2;
  }

  .topology__site-debug-text {
    fill: var(--sw-navy);
    font-size: 10px;
    font-weight: 800;
    pointer-events: none;
  }

  .topology__site-text {
    fill: var(--sw-text-primary);
    text-anchor: middle;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
  }

  .topology__site-text tspan:last-child {
    fill: var(--sw-text-secondary);
    font-size: 10px;
    font-family: var(--sw-font-mono);
  }

  .topology__site-count-bg {
    fill: var(--sw-warning);
    stroke: rgba(8, 16, 32, 0.92);
    stroke-width: 2;
  }

  .topology__site-count {
    fill: var(--sw-navy);
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
  }

  .topology__orphans {
    overflow: hidden;
  }

  .topology__orphan-list {
    display: grid;
    gap: 10px;
  }

  .topology__orphan-item {
    display: grid;
    gap: 2px;
    text-decoration: none;
    padding: 12px;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
    border: 1px solid var(--sw-border-subtle);
  }

  .topology__orphan-item strong {
    color: var(--sw-text-primary);
  }

  .topology__orphan-item span {
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .topology__note {
    margin: 0;
    font-size: 12px;
    color: var(--sw-text-muted);
  }
</style>
