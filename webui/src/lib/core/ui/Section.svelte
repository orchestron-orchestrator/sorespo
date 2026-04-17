<script lang="ts">
  export let title = '';
  export let description = '';
</script>

<section class="section">
  <header class="section__header">
    <div>
      <h4>{title}</h4>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    <slot name="actions" />
  </header>

  <div class="section__content">
    <slot />
  </div>
</section>

<style>
  .section {
    display: grid;
    gap: 1rem;
  }

  :global(.section + .section) {
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }

  .section__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .section__header h4 {
    margin: 0;
  }

  .section__header p {
    margin: 0.35rem 0 0;
    color: var(--text-muted);
  }

  .section__content {
    display: grid;
    gap: 1rem;
  }
</style>
