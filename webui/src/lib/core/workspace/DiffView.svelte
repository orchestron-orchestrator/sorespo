<script lang="ts">
  import { formatDiffValue, type DiffEntry } from '$lib/core/diff/payload-diff';

  let { entries }: { entries: DiffEntry[] } = $props();

  const MAX_INLINE = 60;

  function truncate(value: string): string {
    return value.length > MAX_INLINE ? `${value.slice(0, MAX_INLINE - 1)}…` : value;
  }
</script>

{#if entries.length > 0}
  <ul class="diff">
    {#each entries as entry}
      <li class="diff__entry diff__entry--{entry.kind}">
        <span class="diff__marker" aria-hidden="true">
          {#if entry.kind === 'added'}+{:else if entry.kind === 'removed'}−{:else}~{/if}
        </span>
        <div class="diff__body">
          <code class="diff__path">{entry.path}</code>
          <div class="diff__values">
            {#if entry.kind === 'changed'}
              <span class="diff__before">{truncate(formatDiffValue(entry.before))}</span>
              <span class="diff__arrow" aria-hidden="true">→</span>
              <span class="diff__after">{truncate(formatDiffValue(entry.after))}</span>
            {:else if entry.kind === 'added'}
              <span class="diff__after">{truncate(formatDiffValue(entry.after))}</span>
            {:else}
              <span class="diff__before">{truncate(formatDiffValue(entry.before))}</span>
            {/if}
          </div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .diff {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .diff__entry {
    display: grid;
    grid-template-columns: 16px 1fr;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--sw-radius-md);
    border-left: 3px solid transparent;
    background: var(--sw-bg-card);
    font-size: 12px;
    line-height: 1.35;
  }

  .diff__entry--added {
    border-left-color: var(--sw-success);
    background: var(--sw-success-dim);
  }

  .diff__entry--removed {
    border-left-color: var(--sw-danger);
    background: var(--sw-danger-dim);
  }

  .diff__entry--changed {
    border-left-color: var(--sw-warning);
    background: var(--sw-warning-dim);
  }

  .diff__marker {
    font-family: var(--sw-font-mono);
    font-weight: 700;
    text-align: center;
  }

  .diff__entry--added .diff__marker {
    color: var(--sw-success);
  }

  .diff__entry--removed .diff__marker {
    color: var(--sw-danger);
  }

  .diff__entry--changed .diff__marker {
    color: var(--sw-warning);
  }

  .diff__body {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .diff__path {
    font-family: var(--sw-font-mono);
    font-size: 11px;
    color: var(--sw-text-primary);
    word-break: break-all;
  }

  .diff__values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    font-family: var(--sw-font-mono);
    font-size: 11px;
  }

  .diff__before {
    color: var(--sw-danger);
    text-decoration: line-through;
    text-decoration-color: rgba(239, 68, 68, 0.4);
  }

  .diff__after {
    color: var(--sw-success);
  }

  .diff__arrow {
    color: var(--sw-text-muted);
  }
</style>
