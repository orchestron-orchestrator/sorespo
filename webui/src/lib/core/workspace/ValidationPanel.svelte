<script lang="ts">
  import type { ValidationResult } from '$lib/core/validation/types';

  interface Props {
    validation?: ValidationResult;
    active?: boolean;
  }

  let { validation = { ok: true, errors: {} }, active = true }: Props = $props();
</script>

<section class="validation-panel card">
  <div class="card-header">
    <h4 style="margin:0; font-size:14px; font-weight:600;">Validation</h4>
    <span class:success={active && validation.ok} class:danger={active && !validation.ok} class="pill" style="margin-left:auto;">
      <span class="dot"></span>
      {#if !active}
        Awaiting input
      {:else if validation.ok}
        Ready
      {:else}
        {Object.keys(validation.errors).length} issue{Object.keys(validation.errors).length === 1 ? '' : 's'}
      {/if}
    </span>
  </div>

  <div class="card-body">
    {#if !active}
      <p class="validation-panel__empty">Validation messages appear after you leave a field.</p>
    {:else if validation.ok}
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
  </div>
</section>

<style>
  .validation-panel__empty {
    margin: 0;
    color: var(--sw-text-muted);
    font-size: 13px;
  }

  .validation-panel__list {
    margin: 0;
    padding-left: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  .validation-panel__list li {
    display: grid;
    gap: 2px;
    padding: 8px 12px;
    background: var(--sw-danger-dim);
    border-radius: var(--sw-radius-md);
    border-left: 3px solid var(--sw-danger);
  }

  .validation-panel__list li strong {
    font-family: var(--sw-font-mono);
    font-size: 12px;
    color: var(--sw-text-primary);
  }

  .validation-panel__list li span {
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .validation-panel__warnings {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--sw-border-subtle);
  }

  .validation-panel__warnings h5 {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--sw-warning);
  }

  .validation-panel__warnings ul {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 4px;
  }

  .validation-panel__warnings li {
    font-size: 12px;
    color: var(--sw-text-secondary);
  }
</style>
