<script lang="ts">
  import type { Snippet } from 'svelte';

  import PreviewPanel from '$lib/core/workspace/PreviewPanel.svelte';
  import SaveBar from '$lib/core/workspace/SaveBar.svelte';
  import ValidationPanel from '$lib/core/workspace/ValidationPanel.svelte';

  import type { ServiceModule } from '$lib/core/registry/types';
  import type { ValidationResult } from '$lib/core/validation/types';

  interface Props {
    module: ServiceModule;
    title?: string;
    subtitle?: string;
    draft: unknown;
    original?: unknown;
    validation: ValidationResult;
    dirty?: boolean;
    saving?: boolean;
    deleting?: boolean;
    saveDisabled?: boolean;
    loading?: boolean;
    validationActive?: boolean;
    validationKey?: number;
    statusMessage?: { type: 'success' | 'error'; text: string } | null;
    showDelete?: boolean;
    deleteDisabled?: boolean;
    deleteLabel?: string;
    headerActions?: Snippet;
    onchange?: (next: unknown) => void;
    ontouch?: () => void;
    onsave?: () => void;
    onreset?: () => void;
    ondelete?: () => void;
  }

  let {
    module,
    title = module.title,
    subtitle = module.description,
    draft,
    original = undefined,
    validation,
    dirty = false,
    saving = false,
    deleting = false,
    saveDisabled = false,
    loading = false,
    validationActive = false,
    validationKey = 0,
    statusMessage = null,
    showDelete = false,
    deleteDisabled = false,
    deleteLabel = 'Delete',
    headerActions,
    onchange,
    ontouch,
    onsave,
    onreset,
    ondelete
  }: Props = $props();

  const Editor = $derived(module.Editor);
  const Summary = $derived(module.Summary);
  let payload = $derived(module.serialize(draft));
  let originalPayload = $derived(original === undefined ? undefined : module.serialize(original));
</script>

<div class="workspace">
  <div class="page-header">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <div class="workspace__meta">
      <span class="pill">{module.collectionLabel}</span>
      <span class:success={validationActive && validation.ok} class:warning={validationActive && !validation.ok} class="pill">
        <span class="dot"></span>
        {#if !validationActive}
          Awaiting input
        {:else if validation.ok}
          Valid
        {:else}
          Needs fixes
        {/if}
      </span>
      {#if headerActions}
        {@render headerActions()}
      {/if}
    </div>
  </div>

  {#if statusMessage}
    <div class="flash {statusMessage.type}">{statusMessage.text}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading service data...</div>
  {:else}
    <div class="workspace__grid">
      <section class="workspace__editor card" data-tour="workspace-editor">
        <div class="card-header">
          <h3>Editor</h3>
          <span class="card-badge">{module.id}</span>
          {#if Summary}
            <div style="margin-left: auto;">
              <Summary {draft} />
            </div>
          {/if}
        </div>

        <div class="card-body">
          <Editor
            {draft}
            errors={validation.errors}
            {validationKey}
            onchange={(next: unknown) => onchange?.(next)}
            ontouch={() => ontouch?.()}
          />
        </div>
      </section>

      <div class="workspace__sidebar" data-tour="workspace-sidebar">
        <ValidationPanel {validation} active={validationActive} />
        <PreviewPanel {draft} {payload} {originalPayload} Preview={module.Preview} />
      </div>
    </div>
  {/if}

  <SaveBar
    {dirty}
    {saving}
    {deleting}
    {saveDisabled}
    {showDelete}
    {deleteDisabled}
    {deleteLabel}
    onsave={() => onsave?.()}
    onreset={() => onreset?.()}
    ondelete={() => ondelete?.()}
  />
</div>

<style>
  .workspace {
    display: grid;
    gap: 20px;
  }

  .workspace__meta {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .workspace__grid {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.9fr);
  }

  .workspace__editor,
  .workspace__sidebar {
    min-width: 0;
  }

  .workspace__sidebar {
    display: grid;
    gap: 16px;
    align-content: start;
  }

  @media (max-width: 980px) {
    .workspace__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
