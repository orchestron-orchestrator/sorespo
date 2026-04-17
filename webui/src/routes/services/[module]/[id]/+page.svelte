<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';

  import { createDraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModule } from '$lib/core/registry/service-modules';
  import { getListEntryPath, restconfGetJson, restconfPutJson } from '$lib/core/restconf/client';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';

  export let data: { moduleId: string; serviceId: string };

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
  let loading = true;
  let statusMessage: { type: 'success' | 'error'; text: string } | null = null;
  let lastLoadedKey = '';

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

  $: if (browser && data.serviceId && data.serviceId !== lastLoadedKey) {
    lastLoadedKey = data.serviceId;
    loadDraft();
  }

  onMount(() => {
    const handleRefresh = () => loadDraft(true);
    window.addEventListener('global-refresh', handleRefresh);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });

  async function loadDraft(silent = false): Promise<void> {
    try {
      if (!silent) {
        loading = true;
      }

      statusMessage = null;
      const response = await restconfGetJson(getListEntryPath(serviceModule.restconfRoot, data.serviceId));
      store.replace(serviceModule.parse(response));
    } catch (loadError) {
      statusMessage = {
        type: 'error',
        text: loadError instanceof Error ? loadError.message : 'Failed to load service draft.'
      };
    } finally {
      loading = false;
    }
  }

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
      statusMessage = {
        type: 'success',
        text: `Saved ${key} successfully.`
      };
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

<div class="page-header">
  <div>
    <div class="breadcrumb">
      <a href="/services">Services</a>
      <span>›</span>
      <a href={`/services/${serviceModule.id}`}>{serviceModule.title}</a>
      <span>›</span>
      <span class="monospace">{data.serviceId}</span>
    </div>
  </div>
</div>

<ServiceWorkspace
  module={serviceModule}
  title={`${serviceModule.title} · ${data.serviceId}`}
  subtitle="Edit an existing RESTCONF list entry using the shared service workspace."
  {draft}
  {validation}
  {dirty}
  {saving}
  {loading}
  saveDisabled={!validation.ok || !getKey()}
  {statusMessage}
  on:change={(event) => store.set(event.detail)}
  on:reset={() => store.reset()}
  on:save={handleSave}
/>

<style>
  .breadcrumb {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .breadcrumb a {
    color: var(--brand);
    text-decoration: none;
  }
</style>
