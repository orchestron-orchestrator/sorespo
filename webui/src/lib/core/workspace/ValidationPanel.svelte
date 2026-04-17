<script lang="ts">
  import type { ValidationResult } from '$lib/core/validation/types';

  export let validation: ValidationResult = {
    ok: true,
    errors: {}
  };
</script>

<section class="panel validation-panel">
  <div class="validation-panel__header">
    <h4>Validation</h4>
    <span class:success={validation.ok} class:danger={!validation.ok} class="pill">
      {validation.ok ? 'Ready' : `${Object.keys(validation.errors).length} issue${Object.keys(validation.errors).length === 1 ? '' : 's'}`}
    </span>
  </div>

  {#if validation.ok}
    <p class="validation-panel__empty">No blocking validation errors.</p>
  {:else}
    <ul class="validation-panel__list">
      {#each Object.entries(validation.errors) as [field, message]}
        <li>
          <strong>{field}</strong>
          <span>{message}</span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if validation.warnings?.length}
    <div class="validation-panel__warnings">
      <h5>Warnings</h5>
      <ul>
        {#each validation.warnings as warning}
          <li>{warning}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .validation-panel {
    display: grid;
    gap: 1rem;
  }

  .validation-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .validation-panel__header h4,
  .validation-panel__warnings h5 {
    margin: 0;
  }

  .validation-panel__empty {
    margin: 0;
    color: var(--text-muted);
  }

  .validation-panel__list,
  .validation-panel__warnings ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.7rem;
  }

  .validation-panel__list li {
    display: grid;
    gap: 0.15rem;
  }

  .validation-panel__list span,
  .validation-panel__warnings li {
    color: var(--text-muted);
  }
</style>
