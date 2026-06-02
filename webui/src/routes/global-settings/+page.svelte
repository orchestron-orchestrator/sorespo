<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { invalidate } from '$app/navigation';

  import { createDraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { restconfPutJson } from '$lib/core/restconf/client';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';
  import { module as globalSettingsModule } from '$lib/global-settings/manifest';
  import { serializeGlobalSettingsDraft } from '$lib/global-settings/serialize';

  import type { AnyServiceModule } from '$lib/core/registry/types';
  import type { GlobalSettingsDraft } from '$lib/global-settings/model';

  let { data }: { data: { draft: GlobalSettingsDraft; loadError: string } } = $props();

  const store = createDraftStore<GlobalSettingsDraft>(
    untrack(() => data.draft),
    globalSettingsModule.validate
  );

  let draft = $state(untrack(() => data.draft));
  let original = $state(untrack(() => data.draft));
  let validation = $state(untrack(() => globalSettingsModule.validate(data.draft)));
  let dirty = $state(false);
  let saving = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  let statusMessage: { type: 'success' | 'error'; text: string } | null = $state(
    untrack(() => (data.loadError ? { type: 'error', text: data.loadError } : null))
  );

  const unsubDraft = store.draft.subscribe((value) => (draft = value));
  const unsubOriginal = store.original.subscribe((value) => (original = value));
  const unsubValidation = store.validation.subscribe((value) => (validation = value));
  const unsubDirty = store.dirty.subscribe((value) => (dirty = value));

  onDestroy(() => {
    unsubDraft();
    unsubOriginal();
    unsubValidation();
    unsubDirty();
  });

  onMount(() => {
    const handleRefresh = () => invalidate('data:global-settings');
    window.addEventListener('global-refresh', handleRefresh);
    return () => window.removeEventListener('global-refresh', handleRefresh);
  });

  async function handleSave(): Promise<void> {
    validationActive = true;
    if (!validation.ok) {
      validationKey += 1;
      return;
    }

    try {
      saving = true;
      statusMessage = null;
      const snapshot = draft;
      const payload = serializeGlobalSettingsDraft(snapshot);
      // PUT (replace) rather than PATCH (merge) so a cleared leaf actually
      // disappears server-side.
      await restconfPutJson('data/netinfra:netinfra/global-settings', {
        'netinfra:global-settings': payload
      });
      store.markSaved(snapshot);
      const success = { type: 'success' as const, text: 'Saved global settings.' };
      statusMessage = success;
      setTimeout(() => {
        if (statusMessage === success) statusMessage = null;
      }, 3000);
    } catch (saveError) {
      statusMessage = {
        type: 'error',
        text: saveError instanceof Error ? saveError.message : 'Failed to save global settings.'
      };
    } finally {
      saving = false;
    }
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    statusMessage = null;
    store.reset();
  }
</script>

<ServiceWorkspace
  module={globalSettingsModule as AnyServiceModule}
  title="Global Settings"
  subtitle="Network-wide settings applied to every router (netinfra:netinfra/global-settings)."
  {draft}
  {original}
  {validation}
  {dirty}
  {saving}
  {validationActive}
  {validationKey}
  saveDisabled={validationActive && !validation.ok}
  {statusMessage}
  onchange={(next) => store.set(next as GlobalSettingsDraft)}
  ontouch={() => (validationActive = true)}
  onreset={handleReset}
  onsave={handleSave}
/>
