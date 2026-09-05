<script lang="ts">
  import { onMount } from 'svelte';

  import {
    OTN_ROADM_RADIUS,
    OTN_ROUTER_HEIGHT,
    OTN_ROUTER_WIDTH
  } from '$lib/core/topology/otn-model';
  import { appHref } from '$lib/core/util/nav';

  import type { OtnGraph } from '$lib/core/topology/otn-model';

  let { graph }: { graph: OtnGraph } = $props();
  let selectedPathId: string | null = $state(null);
  let canvas: HTMLDivElement;

  const roadmRadius = OTN_ROADM_RADIUS;
  const routerWidth = OTN_ROUTER_WIDTH;
  const routerHeight = OTN_ROUTER_HEIGHT;

  function togglePath(pathId: string): void {
    selectedPathId = selectedPathId === pathId ? null : pathId;
  }

  onMount(() => {
    canvas.scrollLeft = Math.max(0, (canvas.scrollWidth - canvas.clientWidth) / 2);
  });
</script>

<div class="otn">
  <div class="otn__summary">
    <span class="pill"><span class="dot"></span>{graph.roadms.length} ROADMs</span>
    <span class="pill"><span class="dot"></span>{graph.physicalLinks.length} optical spans</span>
    <span class="pill"><span class="dot"></span>{graph.paths.length} transported links</span>
  </div>

  <div class="card otn__canvas-card">
    <div class="card-body otn__canvas-wrap" bind:this={canvas}>
      <svg
        class="otn__svg"
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        style={`width: ${graph.width}px; height: ${graph.height}px; min-width: 100%;`}
        aria-label="OTN physical topology with backbone path overlays"
        role="img"
      >
        <g class="otn__physical-links">
          {#each graph.physicalLinks as link}
            <g>
              <title>{link.leftRoadm} {link.leftPort} ↔ {link.rightRoadm} {link.rightPort}{link.latency !== null ? ` · ${link.latency} µs` : ''}</title>
              <line
                x1={link.left.x}
                y1={link.left.y}
                x2={link.right.x}
                y2={link.right.y}
                class="otn__physical-link"
              />
            </g>
          {/each}
        </g>

        <g class="otn__attachments">
          {#each graph.attachments as attachment}
            <g>
              <title>{attachment.router} {attachment.routerInterface} ↔ {attachment.roadm} {attachment.roadmPort}</title>
              <line
                x1={attachment.routerPoint.x}
                y1={attachment.routerPoint.y}
                x2={attachment.roadmPoint.x}
                y2={attachment.roadmPoint.y}
                class="otn__attachment"
              />
            </g>
          {/each}
        </g>

        <g class="otn__paths">
          {#each graph.paths as path}
            <g
              class="otn__path"
              class:otn__path--muted={selectedPathId !== null && selectedPathId !== path.id}
              class:otn__path--selected={selectedPathId === path.id}
              style={`--otn-path-color: ${path.color};`}
            >
              <title>{path.label}{path.vlan !== null ? ` · VLAN ${path.vlan}` : ''} · {path.nodes.join(' → ')}</title>
              {#each path.segments as segment}
                <line
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  class="otn__path-halo"
                />
                <line
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  class="otn__path-line"
                  class:otn__path-line--down={path.linkStatus === 'down'}
                />
              {/each}
            </g>
          {/each}
        </g>

        <g class="otn__roadms">
          {#each graph.roadms as roadm}
            <a href={appHref(`/devices/${encodeURIComponent(roadm.name)}`)}>
              <g class="otn__roadm" transform={`translate(${roadm.x}, ${roadm.y})`}>
                <rect
                  class="otn__roadm-core"
                  x={-roadmRadius * 0.72}
                  y={-roadmRadius * 0.72}
                  width={roadmRadius * 1.44}
                  height={roadmRadius * 1.44}
                  rx="4"
                  transform="rotate(45)"
                ></rect>
                <circle class="otn__roadm-center" r="6"></circle>
                <text
                  class="otn__roadm-name"
                  text-anchor="middle"
                  y={roadm.y > graph.height / 2 ? -roadmRadius - 14 : roadmRadius + 24}
                >{roadm.name}</text>
              </g>
            </a>
          {/each}
        </g>

        <g class="otn__routers">
          {#each graph.routers as router}
            <a href={appHref(`/devices/${encodeURIComponent(router.name)}`)}>
              <g class="otn__router" transform={`translate(${router.x}, ${router.y})`}>
                <rect
                  class="otn__router-core"
                  x={-routerWidth / 2}
                  y={-routerHeight / 2}
                  width={routerWidth}
                  height={routerHeight}
                  rx="6"
                ></rect>
                <circle class="otn__router-port" cx={-routerWidth / 2 + 13} cy="0" r="3"></circle>
                <circle class="otn__router-port" cx={routerWidth / 2 - 13} cy="0" r="3"></circle>
                <text class="otn__router-name" text-anchor="middle" dominant-baseline="middle">{router.name}</text>
              </g>
            </a>
          {/each}
        </g>
      </svg>
    </div>
  </div>

  {#if graph.paths.length > 0}
    <div class="otn__legend" aria-label="Backbone path legend">
      {#each graph.paths as path}
        <button
          type="button"
          class="otn__legend-item"
          class:otn__legend-item--muted={selectedPathId !== null && selectedPathId !== path.id}
          class:otn__legend-item--selected={selectedPathId === path.id}
          aria-pressed={selectedPathId === path.id}
          onclick={() => togglePath(path.id)}
        >
          <span class="otn__legend-swatch" style={`background: ${path.color};`}></span>
          <span class="otn__legend-copy">
            <strong>{path.label}</strong>
            <span>{path.vlan !== null ? `VLAN ${path.vlan} · ` : ''}{path.nodes.slice(1, -1).join(' → ')}</span>
          </span>
          <span class:otn__legend-status--down={path.linkStatus === 'down'} class="otn__legend-status">{path.linkStatus}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .otn {
    display: grid;
    gap: 14px;
  }

  .otn__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .otn__canvas-card {
    overflow: hidden;
  }

  .otn__canvas-wrap {
    overflow: auto;
    padding: 0;
    background-color: rgba(8, 16, 32, 0.62);
    background-image:
      radial-gradient(circle at center, rgba(245, 158, 11, 0.09), transparent 48%),
      linear-gradient(rgba(226, 232, 240, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(226, 232, 240, 0.035) 1px, transparent 1px);
    background-size: auto, 32px 32px, 32px 32px;
  }

  .otn__svg {
    display: block;
    width: auto;
    min-width: 100%;
    max-width: none;
    height: auto;
  }

  .otn__physical-link {
    stroke: rgba(148, 163, 184, 0.33);
    stroke-width: 2;
  }

  .otn__attachment {
    stroke: rgba(148, 163, 184, 0.5);
    stroke-width: 1.5;
    stroke-dasharray: 5 5;
  }

  .otn__path {
    transition: opacity 0.18s ease;
  }

  .otn__path--muted {
    opacity: 0.12;
  }

  .otn__path-halo {
    stroke: rgba(8, 16, 32, 0.9);
    stroke-width: 8;
    stroke-linecap: round;
  }

  .otn__path-line {
    stroke: var(--otn-path-color);
    stroke-width: 4;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--otn-path-color) 55%, transparent));
    transition: stroke-width 0.18s ease;
  }

  .otn__path--selected .otn__path-line {
    stroke-width: 6;
  }

  .otn__path-line--down {
    stroke-dasharray: 10 7;
  }

  .otn__roadm,
  .otn__router {
    cursor: pointer;
  }

  .otn__roadm-core {
    fill: rgba(15, 23, 42, 0.97);
    stroke: var(--sw-warning);
    stroke-width: 2;
    transition: fill 0.15s ease, stroke-width 0.15s ease;
  }

  .otn__roadm:hover .otn__roadm-core {
    fill: rgba(67, 45, 12, 0.96);
    stroke-width: 3;
  }

  .otn__roadm-center {
    fill: var(--sw-warning);
    pointer-events: none;
  }

  .otn__roadm-name {
    fill: var(--sw-text-primary);
    font-size: 11px;
    font-weight: 650;
    pointer-events: none;
  }

  .otn__router-core {
    fill: rgba(8, 16, 32, 0.96);
    stroke: var(--sw-accent);
    stroke-width: 1.5;
    transition: fill 0.15s ease, stroke-width 0.15s ease;
  }

  .otn__router:hover .otn__router-core {
    fill: rgba(8, 47, 73, 0.94);
    stroke-width: 2.5;
  }

  .otn__router-port {
    fill: var(--sw-accent);
    pointer-events: none;
  }

  .otn__router-name {
    fill: var(--sw-text-primary);
    font-family: var(--sw-font-mono);
    font-size: 11px;
    font-weight: 650;
    pointer-events: none;
  }

  .otn__legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 8px;
  }

  .otn__legend-item {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    padding: 9px 11px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    color: var(--sw-text-primary);
    background: var(--sw-bg-elevated);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, opacity 0.15s ease;
  }

  .otn__legend-item:hover,
  .otn__legend-item--selected {
    border-color: var(--sw-border-strong);
  }

  .otn__legend-item--muted {
    opacity: 0.48;
  }

  .otn__legend-swatch {
    width: 8px;
    height: 34px;
    border-radius: 2px;
  }

  .otn__legend-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .otn__legend-copy strong,
  .otn__legend-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .otn__legend-copy strong {
    font-size: 12px;
  }

  .otn__legend-copy span {
    color: var(--sw-text-muted);
    font-family: var(--sw-font-mono);
    font-size: 10px;
  }

  .otn__legend-status {
    color: var(--sw-text-muted);
    font-size: 10px;
    text-transform: uppercase;
  }

  .otn__legend-status--down {
    color: var(--sw-danger);
  }

  @media (max-width: 720px) {
    .otn__legend {
      grid-template-columns: 1fr;
    }
  }
</style>