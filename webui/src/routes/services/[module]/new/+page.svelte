<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, untrack } from 'svelte';

  import { createDraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModule } from '$lib/core/registry/service-modules';
  import {
    formatServiceRouteId,
    getDraftKey,
    getDraftKeyLabel,
    getDraftPathKey
  } from '$lib/core/registry/types';
  import { getListEntryPath, restconfPutJson, wrapListEntryBody } from '$lib/core/restconf/client';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';

  let {
    data
  }: {
    data: {
      moduleId: string;
      draft: unknown;
      cloneSourceId: string;
      cloneError: string;
      routeKey: string;
    };
  } = $props();

  let serviceModule = $state(untrack(() => resolveServiceModule(data.moduleId)));
  let store = untrack(() => createDraftStore(data.draft, serviceModule.validate));
  let lastRouteKey = $state(untrack(() => data.routeKey));

  let draft = $state(untrack(() => data.draft));
  let original = $state(untrack(() => data.draft));
  let validation = $state(untrack(() => serviceModule.validate(data.draft)));
  let dirty = $state(false);
  let saving = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  let statusMessage: { type: 'success' | 'error'; text: string } | null = $state(
    untrack(() => (data.cloneError ? { type: 'error', text: data.cloneError } : null))
  );

  let subtitle = $derived.by(() => {
    if (data.cloneSourceId && !data.cloneError) {
      return `Cloned from ${formatServiceRouteId(serviceModule, data.cloneSourceId)}. Update ${getDraftKeyLabel(serviceModule)} before saving the new instance.`;
    }

    return 'Start from an empty draft, validate it locally, and save directly into RESTCONF.';
  });

  let unsubscribeDraft = () => {};
  let unsubscribeOriginal = () => {};
  let unsubscribeValidation = () => {};
  let unsubscribeDirty = () => {};

  untrack(() => bindStore(store));

  onDestroy(() => {
    unbindStore();
  });

  $effect(() => {
    if (data.routeKey === lastRouteKey) return;

    lastRouteKey = data.routeKey;
    initializeModule(data.moduleId, data.draft, data.cloneError);
  });

  function resolveServiceModule(moduleId: string) {
    const module = getServiceModule(moduleId);

    if (!module) {
      throw new Error(`Unknown service module: ${moduleId}`);
    }

    return module;
  }

  function unbindStore(): void {
    unsubscribeDraft();
    unsubscribeOriginal();
    unsubscribeValidation();
    unsubscribeDirty();
  }

  function bindStore(nextStore: ReturnType<typeof createDraftStore>): void {
    unbindStore();

    store = nextStore;
    unsubscribeDraft = store.draft.subscribe((value) => {
      draft = value;
    });
    unsubscribeOriginal = store.original.subscribe((value) => {
      original = value;
    });
    unsubscribeValidation = store.validation.subscribe((value) => {
      validation = value;
    });
    unsubscribeDirty = store.dirty.subscribe((value) => {
      dirty = value;
    });
  }

  function initializeModule(moduleId: string, nextDraft: unknown, cloneError: string): void {
    serviceModule = resolveServiceModule(moduleId);
    bindStore(createDraftStore(nextDraft, serviceModule.validate));
    validationActive = false;
    validationKey += 1;
    saving = false;
    statusMessage = cloneError ? { type: 'error', text: cloneError } : null;
  }

  async function handleSave(): Promise<void> {
    const key = getDraftKey(serviceModule, draft);

    if (!key) {
      statusMessage = {
        type: 'error',
        text: `${getDraftKeyLabel(serviceModule)} is required before saving.`
      };
      return;
    }

    try {
      saving = true;
      statusMessage = null;

      const snapshot = draft;
      const payload = serviceModule.serialize(snapshot);
      await restconfPutJson(
        getListEntryPath(serviceModule.restconfRoot, getDraftPathKey(serviceModule, snapshot)),
        wrapListEntryBody(serviceModule.restconfRoot, payload)
      );
      store.markSaved(snapshot);
    } catch (saveError) {
      statusMessage = {
        type: 'error',
        text: saveError instanceof Error ? saveError.message : 'Failed to save service draft.'
      };
      return;
    } finally {
      saving = false;
    }

    try {
      await goto(`/services/${serviceModule.id}/${encodeURIComponent(key)}`);
    } catch (navError) {
      statusMessage = {
        type: 'error',
        text: `Saved ${key}, but navigation failed: ${navError instanceof Error ? navError.message : 'unknown'}`
      };
    }
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    statusMessage = null;
    store.reset();
  }
</script>

{#if serviceModule}
  <ServiceWorkspace
    module={serviceModule}
    title={`Create ${serviceModule.title}`}
    {subtitle}
    {draft}
    {original}
    {validation}
    {dirty}
    {saving}
    {validationActive}
    {validationKey}
    saveDisabled={!validation.ok || !getDraftKey(serviceModule, draft)}
    {statusMessage}
    onchange={(next) => store.set(next)}
    ontouch={() => (validationActive = true)}
    onreset={handleReset}
    onsave={handleSave}
  />
{/if}
