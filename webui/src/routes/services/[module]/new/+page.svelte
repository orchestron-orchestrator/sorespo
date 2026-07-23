<script lang="ts">
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';

  import { DraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModule } from '$lib/core/registry/service-modules';
  import {
    formatServiceRouteId,
    getDraftKey,
    getDraftKeyLabel,
    getDraftPathKey
  } from '$lib/core/registry/types';
  import {
    getListEntryPath,
    restconfExists,
    restconfPutJson,
    wrapListEntryBody
  } from '$lib/core/restconf/client';
  import { StatusFlash } from '$lib/core/ui/status-flash.svelte';
  import { appHref } from '$lib/core/util/nav';
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
  let store = $state(untrack(() => new DraftStore(data.draft, serviceModule.validate)));
  let lastRouteKey = untrack(() => data.routeKey);

  let saving = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  const status = new StatusFlash(
    untrack(() => (data.cloneError ? { type: 'error', text: data.cloneError } : null))
  );

  let subtitle = $derived.by(() => {
    if (data.cloneSourceId && !data.cloneError) {
      return `Cloned from ${formatServiceRouteId(serviceModule, data.cloneSourceId)}. Update ${getDraftKeyLabel(serviceModule)} before saving the new instance.`;
    }

    return 'Start from an empty draft, validate it locally, and save directly into RESTCONF.';
  });

  $effect(() => {
    if (data.routeKey === lastRouteKey) return;

    lastRouteKey = data.routeKey;
    untrack(() => initializeModule(data.moduleId, data.draft, data.cloneError));
  });

  function resolveServiceModule(moduleId: string) {
    const module = getServiceModule(moduleId);

    if (!module) {
      throw new Error(`Unknown service module: ${moduleId}`);
    }

    return module;
  }

  function initializeModule(moduleId: string, nextDraft: unknown, cloneError: string): void {
    serviceModule = resolveServiceModule(moduleId);
    store = new DraftStore(nextDraft, serviceModule.validate);
    validationActive = false;
    validationKey += 1;
    saving = false;
    status.set(cloneError ? { type: 'error', text: cloneError } : null);
  }

  async function handleSave(): Promise<void> {
    const key = getDraftKey(serviceModule, store.draft);

    if (!key) {
      status.error(`${getDraftKeyLabel(serviceModule)} is required before saving.`);
      return;
    }

    try {
      saving = true;
      status.set(null);

      const snapshot = store.draft;
      const entryPath = getListEntryPath(
        serviceModule.restconfRoot,
        getDraftPathKey(serviceModule, snapshot)
      );

      // PUT is create-or-replace; refuse to silently overwrite an existing entry.
      if (await restconfExists(entryPath)) {
        status.error(
          `${getDraftKeyLabel(serviceModule)} "${key}" already exists — open it from the ${serviceModule.collectionLabel} list or choose a different ${getDraftKeyLabel(serviceModule)}.`
        );
        return;
      }

      const payload = serviceModule.serialize(snapshot);
      await restconfPutJson(entryPath, wrapListEntryBody(serviceModule.restconfRoot, payload));
      store.markSaved(snapshot);
    } catch (saveError) {
      status.error(
        saveError instanceof Error ? saveError.message : 'Failed to save service draft.'
      );
      return;
    } finally {
      saving = false;
    }

    try {
      await goto(appHref(`/services/${serviceModule.id}/${encodeURIComponent(key)}`));
    } catch (navError) {
      status.error(
        `Saved ${key}, but navigation failed: ${navError instanceof Error ? navError.message : 'unknown'}`
      );
    }
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    status.set(null);
    store.reset();
  }
</script>

{#if serviceModule}
  <ServiceWorkspace
    module={serviceModule}
    title={`Create ${serviceModule.title}`}
    {subtitle}
    draft={store.draft}
    original={store.original}
    validation={store.validation}
    dirty={store.dirty}
    {saving}
    {validationActive}
    {validationKey}
    saveDisabled={!store.validation.ok || !getDraftKey(serviceModule, store.draft)}
    statusMessage={status.message}
    onchange={(next) => store.set(next)}
    ontouch={() => (validationActive = true)}
    onreset={handleReset}
    onsave={handleSave}
  />
{/if}
