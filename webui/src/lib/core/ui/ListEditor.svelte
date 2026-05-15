<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    items?: T[];
    addLabel?: string;
    emptyLabel?: string;
    getItemLabel?: (item: T, index: number) => string;
    onadd?: () => void;
    onremove?: (index: number) => void;
    row?: Snippet<[T, number]>;
  }

  let {
    title = '',
    description = '',
    items = [],
    addLabel = 'Add item',
    emptyLabel = 'No items configured yet.',
    getItemLabel = (_item, index) => `Item ${index + 1}`,
    onadd,
    onremove,
    row
  }: Props = $props();
</script>

<div class="list-editor">
  <div class="list-editor__header">
    <div class="list-editor__copy">
      <h5>{title}</h5>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>

    <button class="btn btn-secondary btn-sm" type="button" onclick={() => onadd?.()}>
      {addLabel}
    </button>
  </div>

  {#if items.length === 0}
    <div class="list-editor__empty">{emptyLabel}</div>
  {:else}
    <div class="list-editor__items">
      {#each items as item, index}
        <article class="card list-editor__item">
          <div class="card-header list-editor__item-header">
            <h5>{getItemLabel(item, index)}</h5>
            <button class="btn btn-danger btn-sm" type="button" onclick={() => onremove?.(index)}>
              Remove
            </button>
          </div>

          <div class="card-body list-editor__item-body">
            {@render row?.(item, index)}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .list-editor {
    display: grid;
    gap: 12px;
  }

  .list-editor__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .list-editor__copy {
    display: grid;
    gap: 4px;
  }

  .list-editor__copy h5 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--sw-text-primary);
  }

  .list-editor__copy p {
    margin: 0;
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .list-editor__empty {
    padding: 14px 16px;
    border: 1px dashed var(--sw-border-default);
    border-radius: var(--sw-radius-md);
    color: var(--sw-text-muted);
    background: var(--sw-bg-card);
    font-size: 12px;
  }

  .list-editor__items {
    display: grid;
    gap: 12px;
  }

  .list-editor__item {
    overflow: hidden;
  }

  .list-editor__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .list-editor__item-header h5 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .list-editor__item-body {
    display: grid;
    gap: 16px;
  }

  @media (max-width: 720px) {
    .list-editor__header,
    .list-editor__item-header {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
