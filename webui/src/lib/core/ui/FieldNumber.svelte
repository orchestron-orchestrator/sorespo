<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let label = '';
  export let value: number | null = null;
  export let min: number | undefined = undefined;
  export let step: number | undefined = 1;
  export let placeholder = '';
  export let error = '';
  export let help = '';
  export let required = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ change: number | null }>();
</script>

<label class="field">
  <span class="field__label">
    {label}
    {#if required}
      <span class="field__required">*</span>
    {/if}
  </span>
  <input
    type="number"
    value={value ?? ''}
    {min}
    {step}
    placeholder={placeholder}
    disabled={disabled}
    on:input={(event) => {
      const next = (event.currentTarget as HTMLInputElement).value;
      dispatch('change', next === '' ? null : Number(next));
    }}
  />
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

  input {
    width: 100%;
    padding: 0.75rem 0.9rem;
    border-radius: 0.9rem;
    border: 1px solid var(--border);
    background: var(--surface-alt);
    color: var(--text);
  }

  input:focus {
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
