<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import PreviewPanel from '$lib/core/workspace/PreviewPanel.svelte';
  import SaveBar from '$lib/core/workspace/SaveBar.svelte';
  import ValidationPanel from '$lib/core/workspace/ValidationPanel.svelte';

  import type { ServiceModule } from '$lib/core/registry/types';
  import type { ValidationResult } from '$lib/core/validation/types';

  export let module: ServiceModule;
  export let title = module.title;
  export let subtitle = module.description;
  export let draft: unknown;
  export let validation: ValidationResult;
  export let dirty = false;
  export let saving = false;
  export let saveDisabled = false;
  export let loading = false;
  export let statusMessage: { type: 'success' | 'error'; text: string } | null = null;

  const dispatch = createEventDispatcher();
  let Editor: any;

  $: Editor = module.Editor;
  $: payload = module.serialize(draft);

  function forwardChange(event: CustomEvent<unknown>): void {
    dispatch('change', event.detail);
  }
</script>

<div class="service-workspace">
  <div class="page-header">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <div class="service-workspace__meta">
      <span class="pill">{module.collectionLabel}</span>
      <span class:success={validation.ok} class:warning={!validation.ok} class="pill">
        {validation.ok ? 'Valid draft' : 'Needs fixes'}
      </span>
    </div>
  </div>

  {#if statusMessage}
    <div class="flash {statusMessage.type}">{statusMessage.text}</div>
  {/if}

  {#if loading}
    <div class="loading-state">Loading service data...</div>
  {:else}
    <div class="service-workspace__grid">
      <section class="panel service-workspace__editor">
        <div class="service-workspace__section-header">
          <h3>Editor</h3>
          {#if module.Summary}
            <svelte:component this={module.Summary} {draft} />
          {/if}
        </div>

        <svelte:component
          this={Editor}
          {draft}
          errors={validation.errors}
          on:change={(event: Event) => forwardChange(event as CustomEvent<unknown>)}
        />
      </section>

      <div class="service-workspace__sidebar">
        <ValidationPanel {validation} />
        <PreviewPanel {draft} {payload} Preview={module.Preview} />
      </div>
    </div>
  {/if}

  <SaveBar {dirty} {saving} {saveDisabled} on:save={() => dispatch('save')} on:reset={() => dispatch('reset')} />
</div>

<style>
  .service-workspace {
    display: grid;
    gap: 1.25rem;
  }

  .service-workspace__meta {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .service-workspace__grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
  }

  .service-workspace__editor,
  .service-workspace__sidebar {
    min-width: 0;
  }

  .service-workspace__editor {
    display: grid;
    gap: 1.25rem;
  }

  .service-workspace__section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .service-workspace__section-header h3 {
    margin: 0;
  }

  .service-workspace__sidebar {
    display: grid;
    gap: 1.25rem;
    align-content: start;
  }

  @media (max-width: 980px) {
    .service-workspace__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
