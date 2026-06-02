<script lang="ts">
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';

  import type { GlobalSettingsDraft } from '$lib/global-settings/model';

  interface Props {
    draft: GlobalSettingsDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: GlobalSettingsDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  function patch(values: Partial<GlobalSettingsDraft>): void {
    onchange?.({ ...draft, ...values });
  }
</script>

<div class="editor">
  <Section
    title="iBGP"
    description="Network-wide iBGP settings shared across all routers."
    yangPath="netinfra:netinfra/global-settings"
  >
    <FieldText
      label="iBGP authentication key"
      required={true}
      value={draft.ibgpAuthenticationKey}
      error={errors.ibgpAuthenticationKey}
      {validationKey}
      placeholder="e.g., s3cr3t-ibgp-key"
      yangType="string"
      mono={true}
      help="Applied to every router's iBGP full-mesh neighbor authentication."
      onchange={(value) => patch({ ibgpAuthenticationKey: value })}
      ontouch={() => ontouch?.()}
    />
  </Section>
</div>

<style>
  .editor {
    display: grid;
    gap: 20px;
  }
</style>
