<script lang="ts">
  import FieldShell from '$lib/core/ui/FieldShell.svelte';

  interface Props {
    label?: string;
    value?: string;
    placeholder?: string;
    error?: string;
    help?: string;
    yangType?: string;
    required?: boolean;
    disabled?: boolean;
    mono?: boolean;
    validationKey?: number;
    onchange?: (next: string) => void;
    ontouch?: () => void;
  }

  let {
    label = '',
    value = '',
    placeholder = '',
    error = '',
    help = '',
    yangType = '',
    required = false,
    disabled = false,
    mono = false,
    validationKey = 0,
    onchange,
    ontouch
  }: Props = $props();
</script>

<FieldShell {label} {error} {help} {yangType} {required} {validationKey}>
  {#snippet control({ hasError, blur })}
    <input
      type="text"
      class:mono
      class:has-error={hasError}
      aria-invalid={hasError ? 'true' : undefined}
      {value}
      {placeholder}
      {disabled}
      oninput={(event) => onchange?.((event.currentTarget as HTMLInputElement).value)}
      onblur={() => {
        blur();
        ontouch?.();
      }}
    />
  {/snippet}
</FieldShell>
