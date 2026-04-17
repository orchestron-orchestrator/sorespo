<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import FieldCheckbox from '$lib/core/ui/FieldCheckbox.svelte';
  import FieldNumber from '$lib/core/ui/FieldNumber.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';

  import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

  export let draft: NetinfraRouterDraft;
  export let errors: Record<string, string> = {};

  const dispatch = createEventDispatcher<{ change: NetinfraRouterDraft }>();

  function emit(next: NetinfraRouterDraft): void {
    dispatch('change', next);
  }

  function patch(values: Partial<NetinfraRouterDraft>): void {
    emit({
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
  <Section title="Identity" description="Core YANG list keys and platform selection for the router entry.">
    <div class="editor__grid editor__grid--compact">
      <FieldText
        label="Router name"
        required={true}
        value={draft.name}
        error={errors.name}
        placeholder="AMS-CORE-1"
        on:change={(event) => patch({ name: event.detail })}
      />
      <FieldNumber
        label="Router ID"
        required={true}
        value={draft.id}
        error={errors.id}
        min={1}
        on:change={(event) => patch({ id: event.detail })}
      />
      <FieldText
        label="Platform type"
        required={true}
        value={draft.type}
        error={errors.type}
        placeholder="CiscoIosXr_25_3_1"
        on:change={(event) => patch({ type: event.detail })}
      />
      <FieldNumber
        label="ASN"
        required={true}
        value={draft.asn}
        error={errors.asn}
        min={1}
        on:change={(event) => patch({ asn: event.detail })}
      />
    </div>
  </Section>

  <Section title="Operational behavior" description="Optional metadata and behavior flags from the netinfra model.">
    <div class="editor__grid">
      <FieldText
        label="Role"
        value={draft.role}
        error={errors.role}
        placeholder="edge"
        help="Optional role metadata used by the service model."
        on:change={(event) => patch({ role: event.detail })}
      />

      <div class="editor__toggles">
        <FieldCheckbox
          label="Mock router"
          checked={draft.mock}
          help="Marks this entry as a mock target in the netinfra model."
          on:change={(event) => patch({ mock: event.detail })}
        />
        <FieldCheckbox
          label="Approval required"
          checked={draft.approvalRequired}
          help="Requires human approval for device queue application."
          on:change={(event) => patch({ approvalRequired: event.detail })}
        />
        <FieldCheckbox
          label="Runtime schema fetch"
          checked={draft.featureFlags.runtimeSchemaFetch}
          help="Enables the feature-flags/runtime-schema-fetch leaf."
          on:change={(event) =>
            patch({
              featureFlags: {
                runtimeSchemaFetch: event.detail
              }
            })}
        />
      </div>
    </div>
  </Section>
</div>

<style>
  .editor {
    display: grid;
    gap: 1.25rem;
  }

  .editor__grid {
    display: grid;
    gap: 1rem;
  }

  .editor__grid--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor__toggles {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
    border-radius: 1rem;
    background: var(--surface-alt);
    border: 1px solid var(--border);
  }

  @media (max-width: 720px) {
    .editor__grid--compact {
      grid-template-columns: 1fr;
    }
  }
</style>
