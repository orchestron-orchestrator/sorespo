<script lang="ts">
  import { onMount } from 'svelte';

  import { restconfGetJson } from '$lib/core/restconf/client';
  import FieldCheckbox from '$lib/core/ui/FieldCheckbox.svelte';
  import FieldSelect from '$lib/core/ui/FieldSelect.svelte';
  import FieldText from '$lib/core/ui/FieldText.svelte';
  import Section from '$lib/core/ui/Section.svelte';
  import { listNetinfraRouters } from '$lib/modules/netinfra-router/parse';

  import type { ServiceListItem } from '$lib/core/registry/types';
  import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

  interface Props {
    draft: NetinfraBackboneLinkDraft;
    errors?: Record<string, string>;
    validationKey?: number;
    onchange?: (next: NetinfraBackboneLinkDraft) => void;
    ontouch?: () => void;
  }

  let { draft, errors = {}, validationKey = 0, onchange, ontouch }: Props = $props();
  let routerItems = $state<ServiceListItem[]>([]);
  let loadingRouters = $state(true);
  let routerLoadError = $state('');

  function patch(values: Partial<NetinfraBackboneLinkDraft>): void {
    onchange?.({
      ...draft,
      ...values
    });
  }

  async function loadRouters(): Promise<void> {
    try {
      loadingRouters = true;
      routerLoadError = '';
      const payload = await restconfGetJson('data/netinfra:netinfra');
      routerItems = listNetinfraRouters(payload);
    } catch (error) {
      routerItems = [];
      routerLoadError =
        error instanceof Error ? error.message : 'Failed to load routers from netinfra.';
    } finally {
      loadingRouters = false;
    }
  }

  function buildRouterOptions(currentValue: string): { value: string; label: string }[] {
    const options = new Map<string, string>();

    for (const item of routerItems) {
      options.set(item.id, item.label);
    }

    const current = currentValue.trim();
    if (current && !options.has(current)) {
      options.set(current, `${current} (not in current router list)`);
    }

    return [
      {
        value: '',
        label: loadingRouters
          ? 'Loading routers...'
          : routerItems.length > 0
            ? 'Select router'
            : 'No routers available'
      },
      ...Array.from(options.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([value, label]) => ({ value, label }))
    ];
  }

  let routerFieldHelp = $derived.by(() => {
    if (routerLoadError) {
      return `Router list unavailable: ${routerLoadError}`;
    }

    if (loadingRouters) {
      return 'Loading current router names from netinfra.';
    }

    if (routerItems.length === 0) {
      return 'No routers were returned by netinfra.';
    }

    return 'Options are derived from current netinfra router entries.';
  });

  let leftRouterOptions = $derived(buildRouterOptions(draft.leftRouter));
  let rightRouterOptions = $derived(buildRouterOptions(draft.rightRouter));
  let leftRouterDisabled = $derived(leftRouterOptions.length <= 1);
  let rightRouterDisabled = $derived(rightRouterOptions.length <= 1);

  onMount(() => {
    loadRouters();

    const handleRefresh = () => {
      loadRouters();
    };

    window.addEventListener('global-refresh', handleRefresh);

    return () => {
      window.removeEventListener('global-refresh', handleRefresh);
    };
  });
</script>

<div class="editor">
  <Section
    title="Endpoints"
    description="Define the two routers and interfaces that form the backbone adjacency."
    yangPath="netinfra:backbone-link"
  >
    <div class="editor__grid editor__grid--2col">
      <FieldSelect
        label="Left router"
        required={true}
        value={draft.leftRouter}
        options={leftRouterOptions}
        error={errors.leftRouter}
        help={routerFieldHelp}
        {validationKey}
        yangType="string (key)"
        disabled={leftRouterDisabled}
        onchange={(value) => patch({ leftRouter: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Left interface"
        required={true}
        value={draft.leftInterface}
        error={errors.leftInterface}
        {validationKey}
        placeholder="e.g., ethernet-1/1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ leftInterface: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldSelect
        label="Right router"
        required={true}
        value={draft.rightRouter}
        options={rightRouterOptions}
        error={errors.rightRouter}
        help={routerFieldHelp}
        {validationKey}
        yangType="string (key)"
        disabled={rightRouterDisabled}
        onchange={(value) => patch({ rightRouter: value })}
        ontouch={() => ontouch?.()}
      />
      <FieldText
        label="Right interface"
        required={true}
        value={draft.rightInterface}
        error={errors.rightInterface}
        {validationKey}
        placeholder="e.g., ethernet-1/1"
        yangType="string (key)"
        mono={true}
        onchange={(value) => patch({ rightInterface: value })}
        ontouch={() => ontouch?.()}
      />
    </div>
  </Section>

  <Section
    title="Behavior"
    description="Optional operational flags exposed by the `netinfra:backbone-link` model."
    yangPath="netinfra:backbone-link/*"
  >
    <div class="editor__toggles">
      <FieldCheckbox
        label="Monitor traffic"
        checked={draft.monitorTraffic}
        help="Enables the monitor-traffic leaf on this backbone-link entry."
        onchange={(monitorTraffic) => patch({ monitorTraffic })}
      />
    </div>
  </Section>
</div>

<style>
  .editor {
    display: grid;
    gap: 20px;
  }

  .editor__grid {
    display: grid;
    gap: 16px;
  }

  .editor__grid--2col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor__toggles {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
    border: 1px solid var(--sw-border-subtle);
  }

  @media (max-width: 720px) {
    .editor__grid--2col {
      grid-template-columns: 1fr;
    }
  }
</style>
