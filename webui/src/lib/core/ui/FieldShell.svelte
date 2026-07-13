<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label = '',
    error = '',
    help = '',
    yangType = '',
    required = false,
    validationKey = 0,
    control
  }: {
    label?: string;
    error?: string;
    help?: string;
    yangType?: string;
    required?: boolean;
    validationKey?: number;
    control: Snippet<[{ hasError: boolean; blur: () => void }]>;
  } = $props();

  let touched = $state(false);

  $effect(() => {
    // Reset touched whenever validationKey bumps.
    validationKey;
    touched = false;
  });

  let visibleError = $derived(touched ? error : '');
  let metaText = $derived(visibleError || help || ' ');
</script>

<label class="field">
  <span class="field__label">
    {label}
    {#if required}
      <span class="field__required">*</span>
    {/if}
    {#if yangType}
      <span class="field__yang-type">{yangType}</span>
    {/if}
  </span>
  {@render control({ hasError: !!visibleError, blur: () => (touched = true) })}
  <small class:field__meta--error={!!visibleError} class="field__meta">{metaText}</small>
</label>

<style>
  .field {
    display: grid;
    gap: 6px;
  }

  .field__label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--sw-text-label);
  }

  .field__required {
    color: var(--sw-danger);
    font-weight: 700;
    font-size: 14px;
    line-height: 1;
  }

  .field__yang-type {
    margin-left: auto;
    font-family: var(--sw-font-mono);
    font-size: 10px;
    color: var(--sw-text-muted);
    background: var(--sw-bg-deep);
    padding: 1px 6px;
    border-radius: 3px;
  }

  .field :global(input),
  .field :global(select) {
    width: 100%;
    padding: 9px 12px;
    background: var(--sw-bg-input);
    border: 1px solid var(--sw-border-default);
    border-radius: var(--sw-radius-md);
    color: var(--sw-text-primary);
    font-size: 13px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }

  .field :global(input::placeholder) {
    color: var(--sw-text-muted);
  }

  .field :global(input:focus),
  .field :global(select:focus) {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 3px var(--sw-accent-glow);
  }

  .field :global(input.has-error),
  .field :global(select.has-error) {
    border-color: var(--sw-danger);
    box-shadow: 0 0 0 3px var(--sw-danger-dim);
  }

  .field :global(input:disabled),
  .field :global(select:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .field :global(input.mono) {
    font-family: var(--sw-font-mono);
    font-size: 12px;
  }

  .field :global(input[type='number']) {
    font-family: var(--sw-font-mono);
  }

  .field :global(select) {
    padding-right: 32px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23556677' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .field__meta {
    min-height: 1rem;
    font-size: 11px;
    color: var(--sw-text-muted);
  }

  .field__meta--error {
    color: var(--sw-danger);
  }
</style>
