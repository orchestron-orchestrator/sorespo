<script lang="ts">
  import FieldShell from '$lib/core/ui/FieldShell.svelte';

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
</script>

<FieldShell {label} {error} {help} {yangType} {required} {validationKey}>
  {#snippet control({ hasError, blur })}
    <select
      class:has-error={hasError}
      aria-invalid={hasError ? 'true' : undefined}
      {value}
      {disabled}
      onchange={(event) => onchange?.((event.currentTarget as HTMLSelectElement).value)}
      onblur={() => {
        blur();
        ontouch?.();
      }}
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {/snippet}
</FieldShell>
