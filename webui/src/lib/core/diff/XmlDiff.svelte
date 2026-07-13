<script lang="ts">
  import { highlightXmlDiff } from '$lib/core/diff/xml-diff';

  let {
    diff,
    format = 'xml',
    minHeight = ''
  }: { diff: string; format?: string; minHeight?: string } = $props();

  let runs = $derived(format === 'xml' ? highlightXmlDiff(diff) : []);
</script>

<pre style={minHeight ? `min-height: ${minHeight};` : undefined}>{#if runs.length > 0}{#each runs as run}<span class:diff-add={run.kind === 'add'} class:diff-remove={run.kind === 'remove'}>{run.text}</span>{/each}{:else}{diff}{/if}</pre>

<style>
  pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
    border: 1px solid var(--sw-border-subtle);
    color: var(--sw-text-secondary);
  }

  .diff-add {
    color: var(--sw-success);
  }

  .diff-remove {
    color: var(--sw-danger);
    background: var(--sw-danger-dim);
    border-radius: 4px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
</style>
