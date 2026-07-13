<script lang="ts">
  import FieldShell from '$lib/core/ui/FieldShell.svelte';

  interface Props {
    label?: string;
    value?: number | null;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    error?: string;
    help?: string;
    yangType?: string;
    required?: boolean;
    disabled?: boolean;
    validationKey?: number;
    onchange?: (next: number | null) => void;
    ontouch?: () => void;
  }

  let {
    label = '',
    value = null,
    min,
    max,
    step = 1,
    placeholder = '',
    error = '',
    help = '',
    yangType = '',
    required = false,
    disabled = false,
    validationKey = 0,
    onchange,
    ontouch
  }: Props = $props();

  let effectiveHelp = $derived(
    help || (min !== undefined && max !== undefined ? `Range: ${min} — ${max}` : '')
  );
</script>

<FieldShell {label} {error} help={effectiveHelp} {yangType} {required} {validationKey}>
  {#snippet control({ hasError, blur })}
    <input
      type="number"
      class:has-error={hasError}
      aria-invalid={hasError ? 'true' : undefined}
      value={value ?? ''}
      {min}
      {max}
      {step}
      {placeholder}
      {disabled}
      oninput={(event) => {
        const next = (event.currentTarget as HTMLInputElement).value;
        if (next === '') {
          onchange?.(null);
          return;
        }
        const parsed = Number(next);
        onchange?.(Number.isFinite(parsed) ? parsed : null);
      }}
      onblur={() => {
        blur();
        ontouch?.();
      }}
    />
  {/snippet}
</FieldShell>
