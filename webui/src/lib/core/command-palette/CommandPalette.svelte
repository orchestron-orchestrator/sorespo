<script lang="ts">
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import { get } from 'svelte/store';

  import { queuesPoll } from '$lib/core/orchestron/poll-store';

  import { buildStaticEntries, fetchDynamicEntries, filterEntries } from './index-builder';
  import type { PaletteEntry } from './types';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | null = $state(null);
  let staticEntries: PaletteEntry[] = $state([]);
  let dynamicEntries: PaletteEntry[] = $state([]);
  let loading = $state(false);

  let allEntries = $derived([...staticEntries, ...dynamicEntries]);
  let filtered = $derived(filterEntries(allEntries, query));
  let groups = $derived.by<[string, PaletteEntry[]][]>(() => {
    const map = new Map<string, PaletteEntry[]>();
    for (const entry of filtered) {
      const bucket = map.get(entry.category) ?? [];
      bucket.push(entry);
      map.set(entry.category, bucket);
    }
    return Array.from(map.entries());
  });
  let flat = $derived(groups.flatMap(([, items]) => items));

  $effect(() => {
    if (!open) return;

    selectedIndex = 0;
    query = '';
    staticEntries = buildStaticEntries();
    dynamicEntries = [];
    loading = true;

    const queues = get(queuesPoll).queues;
    void fetchDynamicEntries(queues).then((entries) => {
      dynamicEntries = entries;
      loading = false;
    });

    void tick().then(() => inputEl?.focus());
  });

  $effect(() => {
    // Keep selectedIndex in bounds when filtered results shrink.
    if (selectedIndex >= flat.length) {
      selectedIndex = Math.max(0, flat.length - 1);
    }
  });

  function handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      open = false;
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown') {
      selectedIndex = Math.min(selectedIndex + 1, flat.length - 1);
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowUp') {
      selectedIndex = Math.max(0, selectedIndex - 1);
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      const entry = flat[selectedIndex];
      if (entry) select(entry);
      event.preventDefault();
    }
  }

  function select(entry: PaletteEntry): void {
    open = false;
    void goto(entry.href);
  }
</script>

{#if open}
  <div class="cmdk-overlay">
    <button class="cmdk-scrim" type="button" aria-label="Close palette" onclick={() => (open = false)}></button>
    <div class="cmdk-panel card" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmdk-search">
        <span class="cmdk-prompt" aria-hidden="true">⌘</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          onkeydown={handleKey}
          type="text"
          class="cmdk-input"
          placeholder="Jump to device, service, or queue item…"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <div class="cmdk-results">
        {#if loading && dynamicEntries.length === 0 && filtered.length === staticEntries.length}
          <div class="cmdk-hint-row">Loading entries…</div>
        {/if}

        {#if flat.length === 0 && !loading}
          <div class="cmdk-empty">No results for “{query}”</div>
        {:else}
          {#each groups as [category, items] (category)}
            <div class="cmdk-group">
              <div class="cmdk-group-label">{category}</div>
              {#each items as entry (entry.id)}
                {@const index = flat.indexOf(entry)}
                <button
                  class="cmdk-entry"
                  class:cmdk-entry--selected={index === selectedIndex}
                  onmouseenter={() => (selectedIndex = index)}
                  onclick={() => select(entry)}
                  type="button"
                >
                  <span class="cmdk-entry-label">{entry.label}</span>
                  {#if entry.description}
                    <span class="cmdk-entry-desc">{entry.description}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>

      <div class="cmdk-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .cmdk-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: start center;
    padding: 10vh 1.25rem 0;
  }

  .cmdk-scrim {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(10, 14, 20, 0.72);
    cursor: default;
  }

  .cmdk-panel {
    position: relative;
    z-index: 1;
    display: grid;
    width: min(100%, 36rem);
    max-height: 70vh;
    grid-template-rows: auto 1fr auto;
    border: 1px solid var(--sw-border-default);
    background: var(--sw-bg-surface);
    box-shadow: var(--sw-shadow-elevated);
    overflow: hidden;
    padding: 0;
  }

  .cmdk-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--sw-border-subtle);
  }

  .cmdk-prompt {
    font-family: var(--sw-font-mono);
    color: var(--sw-text-muted);
    font-size: 14px;
  }

  .cmdk-input {
    flex: 1;
    border: 0;
    background: transparent;
    color: var(--sw-text-primary);
    font-size: 15px;
    outline: none;
  }

  .cmdk-input::placeholder {
    color: var(--sw-text-muted);
  }

  .cmdk-results {
    overflow-y: auto;
    padding: 6px 6px 10px;
  }

  .cmdk-group {
    display: grid;
    gap: 1px;
    margin-top: 6px;
  }

  .cmdk-group-label {
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sw-text-muted);
  }

  .cmdk-entry {
    display: flex;
    width: 100%;
    align-items: baseline;
    gap: 12px;
    padding: 9px 12px;
    border: 0;
    border-radius: var(--sw-radius-md);
    background: transparent;
    color: var(--sw-text-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }

  .cmdk-entry--selected,
  .cmdk-entry:hover {
    background: var(--sw-bg-card);
  }

  .cmdk-entry--selected {
    background: var(--sw-accent-glow);
    color: var(--sw-accent);
  }

  .cmdk-entry-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cmdk-entry-desc {
    color: var(--sw-text-muted);
    font-family: var(--sw-font-mono);
    font-size: 11px;
    flex-shrink: 0;
    max-width: 50%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cmdk-entry--selected .cmdk-entry-desc {
    color: var(--sw-accent);
    opacity: 0.75;
  }

  .cmdk-empty,
  .cmdk-hint-row {
    padding: 18px;
    text-align: center;
    color: var(--sw-text-muted);
    font-size: 13px;
  }

  .cmdk-footer {
    display: flex;
    gap: 14px;
    padding: 10px 16px;
    border-top: 1px solid var(--sw-border-subtle);
    color: var(--sw-text-muted);
    font-size: 11px;
  }

  .cmdk-footer kbd {
    display: inline-block;
    padding: 1px 5px;
    margin-right: 3px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: 4px;
    background: var(--sw-bg-deep);
    font-family: var(--sw-font-mono);
    font-size: 10px;
  }
</style>
