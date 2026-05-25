<script lang="ts">
  type FieldOption = {
    value: string;
    label: string;
  };

  interface Props {
    label?: string;
    value?: string;
    options?: FieldOption[];
    error?: string;
    help?: string;
    yangType?: string;
    required?: boolean;
    disabled?: boolean;
    validationKey?: number;
    onchange?: (next: string) => void;
    ontouch?: () => void;
  }

  let {
    label = '',
    value = '',
    options = [],
    error = '',
    help = '',
    yangType = '',
    required = false,
    disabled = false,
    validationKey = 0,
    onchange,
    ontouch
  }: Props = $props();

  let touched = $state(false);

  $effect(() => {
    validationKey;
    touched = false;
  });

  let visibleError = $derived(touched ? error : '');
  let metaText = $derived(visibleError || help || '\u00A0');
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
  <select
    class:has-error={!!visibleError}
    aria-invalid={visibleError ? 'true' : undefined}
    {value}
    {disabled}
    onchange={(event) => onchange?.((event.currentTarget as HTMLSelectElement).value)}
    onblur={() => {
      touched = true;
      ontouch?.();
    }}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
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

  select {
    width: 100%;
    padding: 9px 12px;
    padding-right: 32px;
    background: var(--sw-bg-input);
    border: 1px solid var(--sw-border-default);
    border-radius: var(--sw-radius-md);
    color: var(--sw-text-primary);
    font-size: 13px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23556677' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  select:focus {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 3px var(--sw-accent-glow);
  }

  select.has-error {
    border-color: var(--sw-danger);
    box-shadow: 0 0 0 3px var(--sw-danger-dim);
  }

  select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
