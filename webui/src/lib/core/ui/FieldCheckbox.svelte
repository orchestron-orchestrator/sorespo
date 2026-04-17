<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label = '';
  export let checked = false;
  export let help = '';
  export let error = '';
  export let disabled = false;

  const dispatch = createEventDispatcher<{ change: boolean }>();
</script>

<label class="field-checkbox">
  <div class="field-checkbox__input">
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      on:change={(event) => dispatch('change', (event.currentTarget as HTMLInputElement).checked)}
    />
    <span>{label}</span>
  </div>
  {#if help}
    <small>{help}</small>
  {/if}
  {#if error}
    <span class="field-checkbox__error">{error}</span>
  {/if}
</label>

<style>
  .field-checkbox {
    display: grid;
    gap: 0.35rem;
  }

  .field-checkbox__input {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    font-weight: 600;
  }

  input {
    width: 1rem;
    height: 1rem;
  }

  small {
    color: var(--text-muted);
  }

  .field-checkbox__error {
    color: var(--danger);
    font-size: 0.9rem;
  }
</style>
