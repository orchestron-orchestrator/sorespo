<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let dirty = false;
  export let saving = false;
  export let saveDisabled = false;
  export let saveLabel = 'Save';

  const dispatch = createEventDispatcher<{
    save: void;
    reset: void;
  }>();
</script>

<div class="save-bar panel">
  <div class="save-bar__status">
    <strong>{dirty ? 'Unsaved changes' : 'Draft is up to date'}</strong>
    <span>{dirty ? 'Review the validation panel and save when ready.' : 'No pending edits in this workspace.'}</span>
  </div>

  <div class="save-bar__actions">
    <button class="btn" type="button" disabled={!dirty || saving} on:click={() => dispatch('reset')}>
      Reset
    </button>
    <button class="btn btn-primary" type="button" disabled={saveDisabled || saving} on:click={() => dispatch('save')}>
      {saving ? 'Saving...' : saveLabel}
    </button>
  </div>
</div>

<style>
  .save-bar {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
  }

  .save-bar__status {
    display: grid;
    gap: 0.2rem;
  }

  .save-bar__status span {
    color: var(--text-muted);
    font-size: 0.94rem;
  }

  .save-bar__actions {
    display: flex;
    gap: 0.75rem;
  }

  @media (max-width: 720px) {
    .save-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .save-bar__actions {
      justify-content: stretch;
    }

    .save-bar__actions :global(.btn) {
      flex: 1;
    }
  }
</style>
