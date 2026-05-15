<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import { getServiceModule } from '$lib/core/registry/service-modules';
  import { formatServiceRouteId, getRoutePathKey } from '$lib/core/registry/types';
  import { getListEntryPath, restconfDelete } from '$lib/core/restconf/client';
  import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';

  import type { ServiceListItem } from '$lib/core/registry/types';

  let {
    data
  }: {
    data: {
      moduleId: string;
      title: string;
      description: string;
      items: ServiceListItem[];
      loadError: string;
    };
  } = $props();

  let removingId = $state('');
  let statusMessage: { type: 'success' | 'error'; text: string } | null = $state(null);
  let pendingRemoval: { id: string; label: string } | null = $state(null);

  let serviceModule = $derived(getServiceModule(data.moduleId));
  let items = $derived(data.items);
  let error = $derived(data.loadError);

  onMount(() => {
    const handleRefresh = () => invalidate(`data:services:${data.moduleId}`);
    window.addEventListener('global-refresh', handleRefresh);
    return () => window.removeEventListener('global-refresh', handleRefresh);
  });

  function openRemoval(item: { id: string; label: string }): void {
    pendingRemoval = item;
  }

  async function confirmRemoval(): Promise<void> {
    if (!serviceModule?.deletable || !pendingRemoval) {
      return;
    }

    const item = pendingRemoval;
    pendingRemoval = null;
    const displayId = formatServiceRouteId(serviceModule, item.id);

    try {
      removingId = item.id;
      statusMessage = null;
      await restconfDelete(
        getListEntryPath(serviceModule.restconfRoot, getRoutePathKey(serviceModule, item.id))
      );
      await invalidate(`data:services:${data.moduleId}`);
      const successMessage = { type: 'success' as const, text: `Removed ${displayId}.` };
      statusMessage = successMessage;
      setTimeout(() => {
        if (statusMessage === successMessage) statusMessage = null;
      }, 3000);
    } catch (removeError) {
      statusMessage = {
        type: 'error',
        text: removeError instanceof Error ? removeError.message : 'Failed to remove service.'
      };
    } finally {
      removingId = '';
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

  {#if statusMessage}
    <div class:service-status--error={statusMessage.type === 'error'} class:service-status--success={statusMessage.type === 'success'} class="service-status">
      {statusMessage.text}
    </div>
  {/if}

  {#if error}
    <div class="error-state">{error}</div>
  {:else if !serviceModule.list}
    <div class="empty-state">This module does not expose a collection view yet.</div>
  {:else if items.length === 0}
    <div class="empty-state">No existing {serviceModule.collectionLabel.toLowerCase()} were returned by RESTCONF.</div>
  {:else}
    <div class="service-list">
      {#each items as item}
        <article class="card service-list__item">
          <a class="service-list__link" href={`/services/${serviceModule.id}/${encodeURIComponent(item.id)}`}>
            <div class="service-list__copy">
              <h3>{item.label}</h3>
              {#if item.description}
                <p>{item.description}</p>
              {/if}
            </div>
            <span class="pill monospace">{formatServiceRouteId(serviceModule, item.id)}</span>
          </a>

          <div class="service-list__actions">
            <a
              class="btn btn-secondary btn-sm"
              href={`/services/${serviceModule.id}/new?clone=${encodeURIComponent(item.id)}`}
            >
              Clone
            </a>

            {#if serviceModule.deletable}
              <button class="btn btn-danger btn-sm" type="button" disabled={Boolean(removingId)} onclick={() => openRemoval(item)}>
                {removingId === item.id ? 'Removing...' : 'Remove'}
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}

  <ConfirmDialog
    open={pendingRemoval !== null}
    title={pendingRemoval ? `Remove ${formatServiceRouteId(serviceModule, pendingRemoval.id)}?` : 'Remove service?'}
    message="This removes the RESTCONF entry for this service."
    confirmLabel="Remove"
    oncancel={() => (pendingRemoval = null)}
    onconfirm={confirmRemoval}
  />
{/if}

<style>
  .service-status {
    margin-bottom: 1rem;
    padding: 0.9rem 1rem;
    border-radius: var(--sw-radius-md);
    border: 1px solid var(--sw-border-default);
    background: var(--sw-bg-card);
  }

  .service-status--success {
    border-color: rgba(34, 197, 94, 0.24);
    background: var(--sw-success-dim);
    color: var(--sw-success);
  }

  .service-status--error {
    border-color: rgba(239, 68, 68, 0.28);
    background: var(--sw-danger-dim);
    color: var(--sw-danger);
  }

  .service-list {
    display: grid;
    gap: 1rem;
  }

  .service-list__item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem;
  }

  .service-list__link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    text-decoration: none;
  }

  .service-list__copy {
    min-width: 0;
  }

  .service-list__copy h3,
  .service-list__copy p {
    margin: 0;
  }

  .service-list__copy p {
    margin-top: 0.35rem;
    color: var(--text-muted);
  }

  .service-list__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  @media (max-width: 720px) {
    .service-list__item {
      flex-direction: column;
      align-items: stretch;
    }

    .service-list__actions {
      display: flex;
      justify-content: flex-end;
    }
  }
</style>
