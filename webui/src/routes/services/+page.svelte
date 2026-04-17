<script lang="ts">
  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';

  const modules = listServiceModuleMeta();
</script>

<div class="page-header">
  <div>
    <h2>Services</h2>
    <p>Launch a shared service workspace for each registered CFS module.</p>
  </div>
</div>

<div class="service-grid">
  {#each modules as module}
    <article class="card service-card">
      <div class="service-card__header">
        <div>
          <h3>{module.title}</h3>
          <p>{module.description}</p>
        </div>
        <span class="pill">{module.collectionLabel}</span>
      </div>

      <div class="service-card__actions">
        <a class="btn btn-primary" href={`/services/${module.id}/new`}>Create new</a>
        <a class="btn btn-secondary" href={`/services/${module.id}`}>Browse existing</a>
      </div>
    </article>
  {/each}
</div>

<style>
  .service-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .service-card {
    display: grid;
    gap: 1.25rem;
    padding: 1.35rem;
  }

  .service-card__header {
    display: grid;
    gap: 1rem;
  }

  .service-card__header h3,
  .service-card__header p {
    margin: 0;
  }

  .service-card__header p {
    margin-top: 0.45rem;
    color: var(--text-muted);
  }

  .service-card__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
