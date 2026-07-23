<script lang="ts">
  import '../app.css';

  import { PUBLIC_DEMO } from '$env/static/public';
  import { invalidateAll } from '$app/navigation';
  import { asset } from '$app/paths';
  import { page } from '$app/state';
  import { onMount, type Component, type Snippet } from 'svelte';

  import CommandPalette from '$lib/core/command-palette/CommandPalette.svelte';
  import { isPendingQueueItem } from '$lib/core/orchestron/client';
  import { queuesPoll, refreshQueues } from '$lib/core/orchestron/poll-store';
  import { getServiceModule, listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { formatServiceRouteId } from '$lib/core/registry/types';
  import { appHref, appPathname } from '$lib/core/util/nav';

  let { children }: { children?: Snippet } = $props();

  const serviceModules = listServiceModuleMeta();

  let totalPendingCount = $derived($queuesPoll.queues.filter(isPendingQueueItem).length);
  let paletteOpen = $state(false);
  let DemoShell = $state<Component | null>(null);

  onMount(() => {
    // Statically false outside demo builds, so the chunk is never emitted.
    if (PUBLIC_DEMO === '1') {
      void import('$lib/demo/DemoShell.svelte').then((mod) => {
        DemoShell = mod.default;
      });
    }
  });

  async function handleRefresh(): Promise<void> {
    window.dispatchEvent(new CustomEvent('global-refresh'));
    await Promise.all([refreshQueues(), invalidateAll()]);
  }

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        paletteOpen = !paletteOpen;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function decodePathSegment(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  type Crumb = { label: string; href: string; current: boolean };

  // Static route-segment labels; anything not listed falls back to
  // capitalize() plus the dynamic rules below (module titles, service ids,
  // device names).
  const SEGMENT_LABELS: Record<string, string> = {
    services: 'Services',
    devices: 'Devices',
    operations: 'Operations',
    'config-queue': 'Config Queue',
    'global-settings': 'Global Settings',
    layers: 'Layer Config',
    configure: 'Apply Config',
    new: 'New'
  };

  /** Map a URL path to a friendly, clickable breadcrumb. */
  function getBreadcrumbs(pathname: string): Crumb[] {
    const parts = pathname.split('/').filter(Boolean).map(decodePathSegment);
    if (parts.length === 0) return [{ label: 'Dashboard', href: '/', current: true }];

    const crumbs: Crumb[] = [];
    let href = '';

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      href += `/${encodeURIComponent(part)}`;

      let label = SEGMENT_LABELS[part] ?? capitalize(part);

      if (parts[0] === 'services' && i === 1) {
        label = getServiceModule(part)?.title ?? part;
      } else if (parts[0] === 'services' && i === 2 && part !== 'new') {
        const module = getServiceModule(parts[1]);
        label = module ? formatServiceRouteId(module, part) : part;
      } else if (parts[0] === 'devices' && i === 1) {
        label = part;
      }

      crumbs.push({ label, href, current: i === parts.length - 1 });
    }

    return crumbs;
  }

  let currentPathname = $derived(appPathname(page.url));
  let breadcrumbs = $derived(getBreadcrumbs(currentPathname));
  let pageTitle = $derived(
    breadcrumbs
      .slice()
      .reverse()
      .map((seg) => seg.label)
      .concat('StratoWeave')
      .join(' · ')
  );
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="app-shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">
      <a class="logo-link" href={appHref('/')} aria-label="StratoWeave — go to dashboard">
        <img
          class="logo-img"
          src={asset('/stratoweave-logo.png')}
          alt="StratoWeave — Orchestration Platform"
          width="286"
          height="53"
        />
      </a>
    </div>
    <nav class="sidebar-nav" aria-label="Primary navigation">
      <div class="nav-section">
        <div class="nav-section-label">Overview</div>
        <a
          class="nav-item"
          class:active={currentPathname === '/'}
          href={appHref('/')}
          data-tour="nav-dashboard"
        >
          <span class="nav-icon">◉</span>
          Dashboard
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Network Infra</div>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/devices')}
          href={appHref('/devices')}
          data-tour="nav-devices"
        >
          <span class="nav-icon">⬡</span>
          Devices
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Operations</div>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/operations/config-queue')}
          href={appHref('/operations/config-queue')}
          data-tour="nav-queue"
        >
          <span class="nav-icon">◇</span>
          Config Queue
          {#if totalPendingCount > 0}
            <span class="nav-badge">{totalPendingCount}</span>
          {/if}
        </a>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/configure')}
          href={appHref('/configure')}
          data-tour="nav-configure"
        >
          <span class="nav-icon">⤴</span>
          Apply Config
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Layers</div>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/layers')}
          href={appHref('/layers')}
          data-tour="nav-layers"
        >
          <span class="nav-icon">▤</span>
          Config
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Services</div>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/services')}
          href={appHref('/services')}
          data-tour="nav-services"
        >
          <span class="nav-icon">◈</span>
          Service Modules
        </a>

        <div class="nav-subsection">
          {#each serviceModules as serviceModule}
            <a
              class="nav-item nav-item--sub"
              class:active={currentPathname.startsWith(`/services/${serviceModule.id}`)}
              href={appHref(`/services/${serviceModule.id}`)}
            >
              <span class="nav-icon">·</span>
              {serviceModule.title}
            </a>
          {/each}

          <a
            class="nav-item nav-item--sub"
            class:active={currentPathname.startsWith('/global-settings')}
            href={appHref('/global-settings')}
            data-tour="nav-global-settings"
          >
            <span class="nav-icon nav-icon--gear">⚙</span>
            Global Settings
          </a>
        </div>
      </div>
    </nav>
  </aside>

  <!-- Main area -->
  <div class="app-main-wrap">
    <header class="app-header">
      <nav class="yang-path" aria-label="Breadcrumb">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}
            <span class="separator">›</span>
          {/if}
          {#if crumb.current}
            <span class="segment current" aria-current="page">{crumb.label}</span>
          {:else}
            <a class="segment" href={appHref(crumb.href)}>{crumb.label}</a>
          {/if}
        {/each}
      </nav>

      <div class="header-actions">
        <button class="btn btn-ghost btn-sm cmdk-trigger" type="button" onclick={() => (paletteOpen = true)} aria-label="Open command palette">
          Search <kbd>⌘K</kbd>
        </button>
        <button class="btn btn-ghost btn-sm" type="button" onclick={handleRefresh} data-tour="refresh">
          ⟳ Refresh
        </button>
      </div>
    </header>

    <main class="app-content">
      {@render children?.()}
    </main>
  </div>
</div>

<CommandPalette bind:open={paletteOpen} />

{#if DemoShell}
  <DemoShell />
{/if}

<style>
  .nav-subsection {
    display: grid;
    gap: 2px;
    margin-top: 4px;
    padding-left: 12px;
  }

  .nav-item--sub {
    font-size: 12px;
    padding-left: 28px;
    color: var(--sw-text-muted);
  }

  .nav-item--sub .nav-icon {
    width: 12px;
    font-size: 14px;
  }

  /* The ⚙ glyph's ink sits lower than the · dots; nudge it up to align. */
  .nav-icon--gear {
    transform: translateY(-2px);
  }

  .cmdk-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .cmdk-trigger kbd {
    display: inline-block;
    padding: 1px 5px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: 4px;
    background: rgba(13, 23, 48, 0.6);
    font-family: var(--sw-font-mono);
    font-size: 10px;
    color: var(--sw-text-muted);
  }
</style>
