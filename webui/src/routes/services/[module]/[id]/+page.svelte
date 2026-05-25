<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, invalidate } from '$app/navigation';
  import { onDestroy, onMount, untrack } from 'svelte';

  import { createDraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModule } from '$lib/core/registry/service-modules';
  import {
    formatServiceRouteId,
    getDraftKey,
    getDraftKeyLabel,
    getDraftPathKey,
    getRoutePathKey
  } from '$lib/core/registry/types';
  import {
    getListEntryPath,
    restconfDelete,
    restconfPatchJson,
    wrapListEntryBody
  } from '$lib/core/restconf/client';
  import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';

  let {
    data
  }: {
    data: { moduleId: string; serviceId: string; draft: unknown; loadError: string };
  } = $props();

  let serviceModule = $state(untrack(() => resolveServiceModule(data.moduleId)));
  let store = untrack(() => createDraftStore(data.draft, serviceModule.validate));
  let draft = $state(untrack(() => data.draft));
  let original = $state(untrack(() => data.draft));
  let validation = $state(untrack(() => serviceModule.validate(data.draft)));
  let dirty = $state(false);
  let saving = $state(false);
  let deleting = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  let confirmDeleteOpen = $state(false);
  let statusMessage: { type: 'success' | 'error'; text: string } | null = $state(
    untrack(() => (data.loadError ? { type: 'error', text: data.loadError } : null))
  );
  let lastRouteKey = $state(untrack(() => `${data.moduleId}:${data.serviceId}`));

  let unsubscribeDraft = () => {};
  let unsubscribeOriginal = () => {};
  let unsubscribeValidation = () => {};
  let unsubscribeDirty = () => {};

  let routeKey = $derived(`${data.moduleId}:${data.serviceId}`);
  let cloneHref = $derived(
    `/services/${serviceModule.id}/new?clone=${encodeURIComponent(data.serviceId)}`
  );
  let displayServiceId = $derived(formatServiceRouteId(serviceModule, data.serviceId));

  untrack(() => bindStore(store));

  onDestroy(() => {
    unbindStore();
  });

  $effect(() => {
    if (!browser) return;
    if (routeKey === lastRouteKey) return;

    lastRouteKey = routeKey;
    serviceModule = resolveServiceModule(data.moduleId);
    bindStore(createDraftStore(data.draft, serviceModule.validate));
    saving = false;
    deleting = false;
    validationActive = false;
    validationKey += 1;
    confirmDeleteOpen = false;
    statusMessage = data.loadError ? { type: 'error', text: data.loadError } : null;
  });

  onMount(() => {
    const handleRefresh = () => invalidate(`data:service:${data.moduleId}:${data.serviceId}`);
    window.addEventListener('global-refresh', handleRefresh);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
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
      await restconfPatchJson(
        getListEntryPath(serviceModule.restconfRoot, getDraftPathKey(serviceModule, snapshot)),
        wrapListEntryBody(serviceModule.restconfRoot, payload)
      );
      store.markSaved(snapshot);
      const successMessage = { type: 'success' as const, text: `Saved ${key} successfully.` };
      statusMessage = successMessage;
      setTimeout(() => {
        if (statusMessage === successMessage) statusMessage = null;
      }, 3000);
    } catch (saveError) {
      statusMessage = {
        type: 'error',
        text: saveError instanceof Error ? saveError.message : 'Failed to save service draft.'
      };
    } finally {
      saving = false;
    }
  }

  async function handleDelete(): Promise<void> {
    if (!serviceModule.deletable) {
      return;
    }

    try {
      deleting = true;
      statusMessage = null;
      await restconfDelete(
        getListEntryPath(serviceModule.restconfRoot, getRoutePathKey(serviceModule, data.serviceId))
      );
      await goto(`/services/${serviceModule.id}`, {
        invalidateAll: true
      });
    } catch (deleteError) {
      statusMessage = {
        type: 'error',
        text: deleteError instanceof Error ? deleteError.message : 'Failed to delete service draft.'
      };
    } finally {
      deleting = false;
    }
  }

  async function confirmDelete(): Promise<void> {
    confirmDeleteOpen = false;
    await handleDelete();
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    statusMessage = null;
    store.reset();
  }
</script>

{#snippet cloneAction()}
  <a class="btn btn-secondary btn-sm" href={cloneHref}>Clone as new</a>
{/snippet}

<ServiceWorkspace
  module={serviceModule}
  title={`${serviceModule.title} · ${displayServiceId}`}
  subtitle="Edit an existing RESTCONF list entry using the shared service workspace."
  {draft}
  {original}
  {validation}
  {dirty}
  {saving}
  {deleting}
  {validationActive}
  {validationKey}
  saveDisabled={!validation.ok || !getDraftKey(serviceModule, draft)}
  showDelete={serviceModule.deletable ?? false}
  {statusMessage}
  headerActions={cloneAction}
  onchange={(next) => store.set(next)}
  ontouch={() => (validationActive = true)}
  onreset={handleReset}
  onsave={handleSave}
  ondelete={() => (confirmDeleteOpen = true)}
/>

<ConfirmDialog
  open={confirmDeleteOpen}
  title={`Remove ${displayServiceId}?`}
  message="This removes the RESTCONF entry for this service."
  confirmLabel="Remove"
  oncancel={() => (confirmDeleteOpen = false)}
  onconfirm={confirmDelete}
/>

