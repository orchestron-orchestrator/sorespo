<script lang="ts">
  import FieldCheckbox from '$lib/core/ui/FieldCheckbox.svelte';
  import FieldNumber from '$lib/core/ui/FieldNumber.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';

  import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

  interface Props {
    draft: NetinfraRouterDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: NetinfraRouterDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();

  function patch(values: Partial<NetinfraRouterDraft>): void {
    onchange?.({
      ...draft,
      ...values,
      featureFlags: {
        ...draft.featureFlags,
        ...(values.featureFlags ?? {})
      }
    });
  }
</script>

<div class="editor">
  <Section title="Identity" description="Core YANG list keys and platform selection." yangPath="netinfra:router">
    <div class="editor__grid editor__grid--2col">
      <FieldText
        label="Router name"
        required={true}
        value={draft.name}
        error={errors.name}
        {validationKey}
        placeholder="e.g., pe-ams-01"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ name: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldNumber
        label="Router ID"
        required={true}
        value={draft.id}
        error={errors.id}
        {validationKey}
        min={1}
        max={4294967295}
        yangType="uint32"
        onchange={(value) => patch({ id: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Platform type"
        required={true}
        value={draft.type}
        error={errors.type}
        {validationKey}
        placeholder="e.g., SR Linux, cRPD, Arista EOS"
        yangType="string"
        onchange={(value) => patch({ type: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldNumber
        label="ASN"
        required={true}
        value={draft.asn}
        error={errors.asn}
        {validationKey}
        min={1}
        max={4294967295}
        yangType="inet:as-number"
        onchange={(value) => patch({ asn: value })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>

  <Section title="Operational behavior" description="Optional metadata and behavior flags." yangPath="netinfra:router/*">
    <div class="editor__grid">
      <FieldText
        label="Role"
        value={draft.role}
        error={errors.role}
        {validationKey}
        placeholder="e.g., PE, P, RR"
        yangType="string"
        help="Optional role metadata used by the service model."
        onchange={(value) => patch({ role: value })}
        ontouch={() => ontouch?.()}
      />

      <div class="editor__toggles">
        <FieldCheckbox
          label="Mock router"
          checked={draft.mock}
          help="Marks this entry as a mock target in the netinfra model."
          onchange={(mock) => patch({ mock })}
        />
        <FieldCheckbox
          label="Approval required"
          checked={draft.approvalRequired}
          help="Requires human approval for device queue application."
          onchange={(approvalRequired) => patch({ approvalRequired })}
        />
        <FieldCheckbox
          label="Runtime schema fetch"
          checked={draft.featureFlags.runtimeSchemaFetch}
          help="Enables the feature-flags/runtime-schema-fetch leaf."
          onchange={(runtimeSchemaFetch) =>
            patch({
              featureFlags: { runtimeSchemaFetch }
            })}
        />
      </div>
    </div>
  </Section>
</div>

<style>
  .editor {
    display: grid;
    gap: 20px;
  }

  .editor__grid {
    display: grid;
    gap: 16px;
  }

  .editor__grid--2col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor__toggles {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
    border: 1px solid var(--sw-border-subtle);
  }

  @media (max-width: 720px) {
    .editor__grid--2col {
      grid-template-columns: 1fr;
    }
  }
</style>
