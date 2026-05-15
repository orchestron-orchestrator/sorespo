<script lang="ts">
  import {
    formatPps,
    getLinkLabelPosition,
    getLinkLabelWidth,
    getLinkPpsLabel,
    TOPOLOGY_LINK_LABEL_HEIGHT,
    TOPOLOGY_ROUTER_RADIUS,
    TOPOLOGY_SITE_CARD_HEIGHT,
    TOPOLOGY_SITE_CARD_WIDTH
  } from '$lib/core/topology/model';

  import type { TopologyGraph } from '$lib/core/topology/model';

  export let graph: TopologyGraph;
  export let note = '';

  const routerRadius = TOPOLOGY_ROUTER_RADIUS;
  const siteCardWidth = TOPOLOGY_SITE_CARD_WIDTH;
  const siteCardHeight = TOPOLOGY_SITE_CARD_HEIGHT;
  const linkLabelHeight = TOPOLOGY_LINK_LABEL_HEIGHT;

  $: routerByName = new Map(graph.routers.map((router) => [router.name, router]));
  $: routerCount = graph.routers.length;
  $: linkCount = graph.links.length;
  $: attachedSiteCount = graph.routers.reduce((count, router) => count + router.attachments.length, 0);
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
          <filter id="topology-glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="coloredBlur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>

        <g class="topology__links">
          {#each graph.links as link}
            {#if routerByName.get(link.leftRouter) && routerByName.get(link.rightRouter)}
              {@const leftRouter = routerByName.get(link.leftRouter)!}
              {@const rightRouter = routerByName.get(link.rightRouter)!}
              {@const deltaX = rightRouter.x - leftRouter.x}
              {@const deltaY = rightRouter.y - leftRouter.y}
              {@const length = Math.hypot(deltaX, deltaY) || 1}
              {@const offsetX = (deltaX / length) * (routerRadius + 4)}
              {@const offsetY = (deltaY / length) * (routerRadius + 4)}
              {@const routeId = `${link.leftRouter},${link.leftInterface},${link.rightRouter},${link.rightInterface}`}
              {@const href = `/services/netinfra-backbone-link/${encodeURIComponent(routeId)}`}

              <a {href} class="topology__link-link" aria-label={`Open backbone-link ${link.leftRouter} ${link.leftInterface} ↔ ${link.rightRouter} ${link.rightInterface}, status ${link.linkStatus}`}>
                <line
                  x1={leftRouter.x + offsetX}
                  y1={leftRouter.y + offsetY}
                  x2={rightRouter.x - offsetX}
                  y2={rightRouter.y - offsetY}
                  class="topology__link"
                  class:topology__link--up={link.linkStatus === 'up'}
                  class:topology__link--down={link.linkStatus === 'down'}
                />
                <line
                  x1={leftRouter.x + offsetX}
                  y1={leftRouter.y + offsetY}
                  x2={rightRouter.x - offsetX}
                  y2={rightRouter.y - offsetY}
                  class="topology__link-hit"
                />

                {#if link.leftInterface || link.rightInterface}
                  {@const ppsLabel = getLinkPpsLabel(link)}
                  {@const labelWidth = getLinkLabelWidth(link.leftInterface, link.rightInterface, ppsLabel)}
                  {@const label = getLinkLabelPosition(
                    leftRouter.x,
                    leftRouter.y,
                    rightRouter.x,
                    rightRouter.y
                  )}
                  <g class="topology__link-label-group" transform={`translate(${label.x}, ${label.y})`}>
                    <rect
                      class="topology__link-label-bg"
                      x={-labelWidth / 2}
                      y={-linkLabelHeight / 2}
                      width={labelWidth}
                      height={linkLabelHeight}
                      rx="12"
                    ></rect>
                    <text class="topology__link-label" text-anchor="middle">
                      <tspan x="0" y={link.monitorTraffic ? -13 : -4}>{link.leftInterface || 'left interface'} ↔ {link.rightInterface || 'right interface'}</tspan>
                      {#if link.monitorTraffic}
                        <tspan class="topology__link-pps" x="0" y="9">→ {formatPps(link.leftPps)} pps    ← {formatPps(link.rightPps)}</tspan>
                      {/if}
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
              />
            {/each}
          {/each}
        </g>

        <g class="topology__routers">
          {#each graph.routers as router}
            <a href={`/devices/${encodeURIComponent(router.name)}`}>
              <g
                class="topology__router"
                class:topology__router--approval={router.approvalRequired}
                transform={`translate(${router.x}, ${router.y})`}
              >
                <circle
                  class="topology__router-ring"
                  r={routerRadius + 10}
                  filter="url(#topology-glow)"
                ></circle>
                <circle class="topology__router-core" r={routerRadius}></circle>
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
              <a href={`/services/l3vpn-site/${encodeURIComponent(attachment.siteId)}`}>
                <g
                  class="topology__site"
                  transform={`translate(${attachment.x}, ${attachment.y})`}
                >
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
          <a class="topology__orphan-item" href={`/services/l3vpn-site/${encodeURIComponent(attachment.siteId)}`}>
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
    background:
      radial-gradient(circle at top, rgba(45, 212, 191, 0.08), transparent 42%),
      linear-gradient(180deg, rgba(17, 24, 32, 0.95), rgba(10, 14, 20, 0.98));
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
    stroke: rgba(136, 153, 170, 0.45);
    stroke-width: 3;
    transition: stroke 0.15s ease, stroke-width 0.15s ease;
    pointer-events: none;
  }

  .topology__link--up {
    stroke: rgba(34, 197, 94, 0.85);
  }

  .topology__link--down {
    stroke: rgba(239, 68, 68, 0.9);
  }

  .topology__link-hit {
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
  }

  .topology__link-link:hover .topology__link {
    stroke: var(--sw-accent);
    stroke-width: 4;
  }

  .topology__link-link:hover .topology__link-label-bg {
    stroke: var(--sw-accent);
  }

  .topology__link-label-bg {
    fill: rgba(10, 14, 20, 0.8);
    stroke: rgba(38, 48, 64, 0.95);
    stroke-width: 1;
    transition: stroke 0.15s ease;
  }

  .topology__link-label {
    fill: var(--sw-text-muted);
    font-size: 10px;
    font-family: var(--sw-font-mono);
    dominant-baseline: middle;
    pointer-events: none;
  }

  .topology__link-label tspan:last-child {
    fill: var(--sw-text-secondary);
  }

  .topology__link-label .topology__link-pps {
    fill: var(--sw-accent);
    font-size: 11px;
    font-weight: 600;
  }

  .topology__attachment-link {
    stroke: rgba(45, 212, 191, 0.55);
    stroke-width: 2;
    stroke-dasharray: 6 6;
  }

  .topology__router {
    cursor: pointer;
  }

  .topology__router-ring {
    fill: rgba(45, 212, 191, 0.09);
    stroke: rgba(45, 212, 191, 0.22);
    stroke-width: 2;
  }

  .topology__router-core {
    fill: rgba(17, 24, 32, 0.96);
    stroke: rgba(45, 212, 191, 0.9);
    stroke-width: 3;
    transition: transform 0.15s ease, stroke 0.15s ease;
  }

  .topology__router:hover .topology__router-core {
    transform: scale(1.03);
    stroke: #4ef2de;
  }

  .topology__router--approval .topology__router-core {
    stroke: var(--sw-warning);
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
    fill: rgba(22, 30, 40, 0.96);
    stroke: rgba(59, 130, 246, 0.7);
    stroke-width: 2;
  }

  .topology__site:hover .topology__site-card {
    stroke: #65a8ff;
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
    stroke: rgba(10, 14, 20, 0.9);
    stroke-width: 2;
  }

  .topology__site-count {
    fill: var(--sw-bg-deep);
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
