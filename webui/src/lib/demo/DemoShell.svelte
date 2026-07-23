<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { refreshQueues } from '$lib/core/orchestron/poll-store';
  import { appPathname } from '$lib/core/util/nav';
  import { resetDemoState } from '$lib/demo/state';
  import Tour from '$lib/demo/tour/Tour.svelte';
  import { isTourDone, startTour } from '$lib/demo/tour/tour-state.svelte';

  const TUTORIAL_URL = 'https://www.stratoweave.org/tutorials/exploring-the-webui/';

  let resetting = $state(false);

  onMount(() => {
    // Deep link: https://…/demo/webui/?tour=1#/ (the query must precede the
    // hash to be visible to the app under the hash router). First-time
    // visitors get the tour only when landing on the dashboard — a deep link
    // straight to some page came to see that page, not the welcome step.
    const wantsTour = page.url.searchParams.get('tour') === '1';
    if (wantsTour || (!isTourDone() && appPathname(page.url) === '/')) {
      void startTour(0);
    }
  });

  async function handleReset(): Promise<void> {
    resetting = true;
    try {
      resetDemoState();
      window.dispatchEvent(new CustomEvent('global-refresh'));
      await Promise.all([refreshQueues(), invalidateAll()]);
    } finally {
      resetting = false;
    }
  }
</script>

<div class="demo-bar" role="note" aria-label="Demo mode">
  <span class="demo-bar__badge">Demo</span>
  <span class="demo-bar__text">
    Interactive demo — simulated data, nothing here touches a real network.
  </span>
  <div class="demo-bar__actions">
    <button class="btn btn-ghost btn-sm" type="button" onclick={() => void startTour(0)}>
      Restart tour
    </button>
    <button class="btn btn-ghost btn-sm" type="button" disabled={resetting} onclick={handleReset}>
      {resetting ? 'Resetting…' : 'Reset data'}
    </button>
    <a class="demo-bar__link" href={TUTORIAL_URL} target="_blank" rel="noopener">Tutorial ↗</a>
  </div>
</div>

<Tour />

<style>
  .demo-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 14px;
    border-top: 1px solid var(--sw-border-subtle);
    background: var(--sw-bg-chrome);
    backdrop-filter: blur(8px);
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .demo-bar__badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--sw-warning-dim);
    color: var(--sw-warning);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .demo-bar__text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .demo-bar__actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .demo-bar__link {
    padding: 4px 8px;
    color: var(--sw-accent);
    text-decoration: none;
    font-size: 12px;
  }

  .demo-bar__link:hover {
    text-decoration: underline;
  }

  /* Keep page content reachable above the fixed bar. */
  :global(.app-content) {
    padding-bottom: 56px;
  }

  @media (max-width: 640px) {
    .demo-bar__text {
      display: none;
    }
  }
</style>
