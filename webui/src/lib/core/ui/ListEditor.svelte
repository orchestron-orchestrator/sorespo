<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label = 'Items';
  export let items: string[] = [];
  export let placeholder = 'New item';
  export let emptyLabel = 'No items added yet.';

  const dispatch = createEventDispatcher<{ change: string[] }>();

  let pending = '';

  function updateItem(index: number, value: string): void {
    dispatch(
      'change',
      items.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function addItem(): void {
    if (!pending.trim()) {
      return;
    }

    dispatch('change', [...items, pending.trim()]);
    pending = '';
  }

  function removeItem(index: number): void {
    dispatch(
      'change',
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  }
</script>

<div class="list-editor">
  <div class="list-editor__header">
    <strong>{label}</strong>
  </div>

  {#if items.length === 0}
    <p class="list-editor__empty">{emptyLabel}</p>
  {:else}
    <div class="list-editor__items">
      {#each items as item, index}
        <div class="list-editor__row">
          <input type="text" value={item} on:input={(event) => updateItem(index, (event.currentTarget as HTMLInputElement).value)} />
          <button type="button" class="btn" on:click={() => removeItem(index)}>Remove</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="list-editor__row">
    <input type="text" bind:value={pending} {placeholder} />
    <button type="button" class="btn btn-secondary" on:click={addItem}>Add</button>
  </div>
</div>

<style>
  .list-editor {
    display: grid;
    gap: 0.8rem;
  }

  .list-editor__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .list-editor__empty {
    margin: 0;
    color: var(--text-muted);
  }

  .list-editor__items {
    display: grid;
    gap: 0.6rem;
  }

  .list-editor__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.7rem;
  }

  input {
    width: 100%;
    padding: 0.75rem 0.9rem;
    border-radius: 0.9rem;
    border: 1px solid var(--border);
    background: var(--surface-alt);
    color: var(--text);
  }
</style>
