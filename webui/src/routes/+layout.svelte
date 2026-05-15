<script lang="ts">
  import '../app.css';

  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount, type Snippet } from 'svelte';

  import CommandPalette from '$lib/core/command-palette/CommandPalette.svelte';
  import { queuesPoll, refreshQueues } from '$lib/core/orchestron/poll-store';
  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { version } from '../../package.json';

  let { children }: { children?: Snippet } = $props();

  const serviceModules = listServiceModuleMeta();

  let totalPendingCount = $derived($queuesPoll.queues.length);
  let paletteOpen = $state(false);

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

  /** Derive a YANG-path breadcrumb from the current route */
  function getYangSegments(pathname: string): { label: string; current: boolean }[] {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'dashboard', current: true }];

    return parts.map((p, i) => ({
      label: decodePathSegment(p),
      current: i === parts.length - 1
    }));
  }

  let currentPathname = $derived(page.url.pathname);
  let yangSegments = $derived(getYangSegments(currentPathname));
  let pageTitle = $derived(
    yangSegments
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
      <div class="logo-mark">SW</div>
      <span class="logo-text">StratoWeave</span>
      <span class="logo-version">v{version}</span>
    </div>
    <nav class="sidebar-nav" aria-label="Primary navigation">
      <div class="nav-section">
        <div class="nav-section-label">Overview</div>
        <a
          class="nav-item"
          class:active={currentPathname === '/'}
          href="/"
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
          href="/devices"
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
          href="/operations/config-queue"
        >
          <span class="nav-icon">◇</span>
          Config Queue
          {#if totalPendingCount > 0}
            <span class="nav-badge">{totalPendingCount}</span>
          {/if}
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-label">Services</div>
        <a
          class="nav-item"
          class:active={currentPathname.startsWith('/services')}
          href="/services"
        >
          <span class="nav-icon">◈</span>
          Service Modules
        </a>

        <div class="nav-subsection">
          {#each serviceModules as serviceModule}
            <a
              class="nav-item nav-item--sub"
              class:active={currentPathname.startsWith(`/services/${serviceModule.id}`)}
              href={`/services/${serviceModule.id}`}
            >
              <span class="nav-icon">·</span>
              {serviceModule.title}
            </a>
          {/each}
        </div>
      </div>
    </nav>
  </aside>

  <!-- Main area -->
  <div class="app-main-wrap">
    <header class="app-header">
      <div class="yang-path">
        {#each yangSegments as seg, i}
          {#if i > 0}
            <span class="separator">/</span>
          {/if}
          <span class="segment" class:current={seg.current}>{seg.label}</span>
        {/each}
      </div>

      <div class="header-actions">
        <button class="btn btn-ghost btn-sm cmdk-trigger" type="button" onclick={() => (paletteOpen = true)} aria-label="Open command palette">
          Search <kbd>⌘K</kbd>
        </button>
        <button class="btn btn-ghost btn-sm" type="button" onclick={handleRefresh}>
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
    background: var(--sw-bg-deep);
    font-family: var(--sw-font-mono);
    font-size: 10px;
    color: var(--sw-text-muted);
  }
</style>
