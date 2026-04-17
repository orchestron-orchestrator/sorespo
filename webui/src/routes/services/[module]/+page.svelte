<script lang="ts">
  import { onMount } from 'svelte';

  import { getServiceModule } from '$lib/core/registry/service-modules';
  import { restconfGetJson } from '$lib/core/restconf/client';

  export let data: { moduleId: string; title: string; description: string };

  const serviceModule = getServiceModule(data.moduleId);

  let loading = Boolean(serviceModule?.list);
  let error = '';
  let items: { id: string; label: string; description?: string }[] = [];

  onMount(() => {
    if (!serviceModule?.list) {
      loading = false;
      return;
    }

    loadItems();
  });

  async function loadItems(): Promise<void> {
    if (!serviceModule?.list) {
      return;
    }

    try {
      loading = true;
      error = '';
      const response = await restconfGetJson(serviceModule.restconfRoot);
      items = serviceModule.list(response);
    } catch (loadError) {
      error = loadError instanceof Error ? loadError.message : 'Failed to load existing services.';
    } finally {
      loading = false;
    }
  }
</script>

{#if serviceModule}
  <div class="page-header">
    <div>
      <h2>{serviceModule.title}</h2>
      <p>{serviceModule.description}</p>
    </div>
    <div>
      <a class="btn btn-primary" href={`/services/${serviceModule.id}/new`}>Create new</a>
    </div>
  </div>

  {#if loading}
    <div class="loading-state">Loading {serviceModule.collectionLabel.toLowerCase()}...</div>
  {:else if error}
    <div class="error-state">{error}</div>
  {:else if !serviceModule.list}
    <div class="empty-state">This module does not expose a collection view yet.</div>
  {:else if items.length === 0}
    <div class="empty-state">No existing {serviceModule.collectionLabel.toLowerCase()} were returned by RESTCONF.</div>
  {:else}
    <div class="service-list">
      {#each items as item}
        <a class="card service-list__item" href={`/services/${serviceModule.id}/${encodeURIComponent(item.id)}`}>
          <div>
            <h3>{item.label}</h3>
            {#if item.description}
              <p>{item.description}</p>
            {/if}
          </div>
          <span class="pill monospace">{item.id}</span>
        </a>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .service-list {
    display: grid;
    gap: 1rem;
  }

  .service-list__item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.2rem;
    text-decoration: none;
  }

  .service-list__item h3,
  .service-list__item p {
    margin: 0;
  }

  .service-list__item p {
    margin-top: 0.35rem;
    color: var(--text-muted);
  }
</style>
