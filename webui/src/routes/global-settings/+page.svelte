<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { invalidate } from '$app/navigation';

  import { DraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { restconfPutJson } from '$lib/core/restconf/client';
  import { StatusFlash } from '$lib/core/ui/status-flash.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';
  import { module as globalSettingsModule } from '$lib/global-settings/manifest';
  import { serializeGlobalSettingsDraft } from '$lib/global-settings/serialize';

  import type { AnyServiceModule } from '$lib/core/registry/types';
  import type { GlobalSettingsDraft } from '$lib/global-settings/model';

  let { data }: { data: { draft: GlobalSettingsDraft; loadError: string } } = $props();

  let store = $state(
    untrack(() => new DraftStore<GlobalSettingsDraft>(data.draft, globalSettingsModule.validate))
  );
  let saving = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  const status = new StatusFlash(
    untrack(() => (data.loadError ? { type: 'error', text: data.loadError } : null))
  );
  let lastData = untrack(() => data);

  $effect(() => {
    const nextData = data;
    if (nextData === lastData) return;

    untrack(() => {
      lastData = nextData;

      // A reload (Refresh, invalidate) must not clobber unsaved edits.
      if (store.dirty) {
        if (nextData.loadError) status.error(nextData.loadError);
        return;
      }

      store = new DraftStore<GlobalSettingsDraft>(nextData.draft, globalSettingsModule.validate);
      saving = false;
      validationActive = false;
      validationKey += 1;
      status.set(nextData.loadError ? { type: 'error', text: nextData.loadError } : null);
    });
  });

  onMount(() => onGlobalRefresh(() => invalidate('data:global-settings')));

  async function handleSave(): Promise<void> {
    validationActive = true;
    if (!store.validation.ok) {
      validationKey += 1;
      return;
    }

    try {
      saving = true;
      status.set(null);
      const snapshot = store.draft;
      const payload = serializeGlobalSettingsDraft(snapshot);
      // PUT (replace) rather than PATCH (merge) so a cleared leaf actually
      // disappears server-side.
      await restconfPutJson('data/netinfra:netinfra/global-settings', {
        'netinfra:global-settings': payload
      });
      store.markSaved(snapshot);
      status.flash('Saved global settings.');
    } catch (saveError) {
      status.error(
        saveError instanceof Error ? saveError.message : 'Failed to save global settings.'
      );
    } finally {
      saving = false;
    }
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    status.set(null);
    store.reset();
  }
</script>

<ServiceWorkspace
  module={globalSettingsModule as AnyServiceModule}
  title="Global Settings"
  subtitle="Network-wide settings applied to every router (netinfra:netinfra/global-settings)."
  draft={store.draft}
  original={store.original}
  validation={store.validation}
  dirty={store.dirty}
  {saving}
  {validationActive}
  {validationKey}
  saveDisabled={validationActive && !store.validation.ok}
  statusMessage={status.message}
  onchange={(next) => store.set(next as GlobalSettingsDraft)}
  ontouch={() => (validationActive = true)}
  onreset={handleReset}
  onsave={handleSave}
/>
