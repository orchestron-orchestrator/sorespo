<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';

  import { createDraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModule } from '$lib/core/registry/service-modules';
  import { getListEntryPath, restconfPutJson } from '$lib/core/restconf/client';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';

  export let data: { moduleId: string };

  const serviceModule = (() => {
    const module = getServiceModule(data.moduleId);

    if (!module) {
      throw new Error(`Unknown service module: ${data.moduleId}`);
    }

    return module;
  })();

  const store = createDraftStore(serviceModule.createDraft(), serviceModule.validate);

  let draft = serviceModule.createDraft();
  let validation = serviceModule.validate(draft);
  let dirty = false;
  let saving = false;
  let statusMessage: { type: 'success' | 'error'; text: string } | null = null;

  const unsubscribeDraft = store.draft.subscribe((value) => {
    draft = value;
  });

  const unsubscribeValidation = store.validation.subscribe((value) => {
    validation = value;
  });

  const unsubscribeDirty = store.dirty.subscribe((value) => {
    dirty = value;
  });

  onDestroy(() => {
    unsubscribeDraft();
    unsubscribeValidation();
    unsubscribeDirty();
  });

  function getKey(): string {
    const value = (draft as Record<string, unknown>)[serviceModule.keyParam];
    return typeof value === 'string' ? value.trim() : value !== null && value !== undefined ? String(value) : '';
  }

  async function handleSave(): Promise<void> {
    const key = getKey();

    if (!key) {
      statusMessage = {
        type: 'error',
        text: `The "${serviceModule.keyParam}" field is required before saving.`
      };
      return;
    }

    try {
      saving = true;
      statusMessage = null;

      const payload = serviceModule.serialize(draft);
      await restconfPutJson(getListEntryPath(serviceModule.restconfRoot, key), payload);
      store.markSaved();

      await goto(`/services/${serviceModule.id}/${encodeURIComponent(key)}`, {
        invalidateAll: true
      });
    } catch (saveError) {
      statusMessage = {
        type: 'error',
        text: saveError instanceof Error ? saveError.message : 'Failed to save service draft.'
      };
    } finally {
      saving = false;
    }
  }
</script>

<ServiceWorkspace
  module={serviceModule}
  title={`Create ${serviceModule.title}`}
  subtitle="Start from an empty draft, validate it locally, and save directly into RESTCONF."
  {draft}
  {validation}
  {dirty}
  {saving}
  saveDisabled={!validation.ok || !getKey()}
  {statusMessage}
  on:change={(event) => store.set(event.detail)}
  on:reset={() => store.reset()}
  on:save={handleSave}
/>
