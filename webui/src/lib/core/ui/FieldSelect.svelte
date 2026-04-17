<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type FieldOption = {
    value: string;
    label: string;
  };

  export let label = '';
  export let value = '';
  export let options: FieldOption[] = [];
  export let error = '';
  export let help = '';
  export let required = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ change: string }>();
</script>

<label class="field">
  <span class="field__label">
    {label}
    {#if required}
      <span class="field__required">*</span>
    {/if}
  </span>
  <select value={value} disabled={disabled} on:change={(event) => dispatch('change', (event.currentTarget as HTMLSelectElement).value)}>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if help}
    <small>{help}</small>
  {/if}
  {#if error}
    <span class="field__error">{error}</span>
  {/if}
</label>

<style>
  .field {
    display: grid;
    gap: 0.45rem;
  }

  .field__label {
    font-weight: 600;
  }

  .field__required {
    color: var(--danger);
  }

  select {
    width: 100%;
    padding: 0.75rem 0.9rem;
    border-radius: 0.9rem;
    border: 1px solid var(--border);
    background: var(--surface-alt);
    color: var(--text);
  }

  select:focus {
    outline: 2px solid rgba(13, 90, 136, 0.18);
    border-color: var(--brand);
  }

  small {
    color: var(--text-muted);
  }

  .field__error {
    color: var(--danger);
    font-size: 0.9rem;
  }
</style>
