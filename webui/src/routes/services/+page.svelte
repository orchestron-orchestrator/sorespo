<script lang="ts">
  import { listServiceModuleMeta } from '$lib/core/registry/service-modules';
  import { appHref } from '$lib/core/util/nav';

  const modules = listServiceModuleMeta();
</script>

<div class="page-header">
  <div>
    <h2>Services</h2>
  </div>
</div>

<div class="service-grid">
  {#each modules as module}
    <article class="service-card card">
      <div class="card-header">
        <h3>{module.title}</h3>
        <span class="card-badge" style="margin-left:auto;">{module.collectionLabel}</span>
      </div>

      <div class="card-body">
        <p class="service-card__desc">{module.description}</p>

        <div class="service-card__actions">
          <a class="btn btn-primary" href={appHref(`/services/${module.id}/new`)}>+ Create new</a>
          <a class="btn btn-secondary" href={appHref(`/services/${module.id}`)}>View {module.collectionLabel.replace(/^[A-Z](?=[a-z])/, (initial) => initial.toLowerCase())}</a>
        </div>
      </div>
    </article>
  {/each}
</div>

<style>
  .service-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .service-card__desc {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--sw-text-secondary);
    line-height: 1.5;
  }

  .service-card__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
