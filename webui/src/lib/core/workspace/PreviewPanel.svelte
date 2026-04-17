<script lang="ts">
  export let draft: unknown;
  export let payload: unknown;
  export let Preview: any = null;
</script>

<section class="panel preview-panel">
  <div class="preview-panel__header">
    <h4>Preview</h4>
    <span class="pill">RESTCONF payload</span>
  </div>

  {#if Preview}
    <svelte:component this={Preview} {draft} {payload} />
  {:else}
    <pre>{JSON.stringify(payload, null, 2)}</pre>
  {/if}
</section>

<style>
  .preview-panel {
    display: grid;
    gap: 1rem;
  }

  .preview-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .preview-panel__header h4 {
    margin: 0;
  }

  pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    border-radius: 1rem;
    background: #0f2335;
    color: #dcecf9;
    font-size: 0.88rem;
    line-height: 1.55;
  }
</style>
