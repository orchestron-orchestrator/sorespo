<script lang="ts">
  import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
  import { restconfRaw } from '$lib/core/restconf/client';

  type Format = 'json' | 'xml';

  const APPLY_TIMEOUT_MS = 30_000;

  let body = $state('');
  let format = $state<Format>('json');
  let applying = $state(false);
  let confirmOpen = $state(false);
  let dragging = $state(false);
  let statusMessage = $state<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  let canApply = $derived(!applying && body.trim().length > 0);
  let charCount = $derived(body.length);

  function setFormat(next: Format): void {
    format = next;
    statusMessage = null;
  }

  function inferFormatFromExtension(name: string): Format | null {
    const ext = name.toLowerCase().split('.').pop() ?? '';
    if (ext === 'xml') return 'xml';
    if (ext === 'json') return 'json';
    return null;
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      body = text;
      const detected = inferFormatFromExtension(file.name);
      if (detected) format = detected;
      statusMessage = {
        type: 'success',
        text: `Loaded ${file.name} (${text.length.toLocaleString()} chars)`
      };
    } catch (err) {
      statusMessage = {
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to read file.'
      };
    }
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    dragging = true;
  }

  function handleDragLeave(event: DragEvent): void {
    // Only flip off when leaving the drop zone itself, not just hovering
    // a child element.
    if (event.currentTarget instanceof Element && event.relatedTarget instanceof Node) {
      if (event.currentTarget.contains(event.relatedTarget)) return;
    }
    dragging = false;
  }

  function validateJsonOrNull(): string | null {
    if (format !== 'json') return null;
    try {
      JSON.parse(body);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid JSON.';
    }
  }

  function requestApply(): void {
    statusMessage = null;
    const jsonError = validateJsonOrNull();
    if (jsonError) {
      statusMessage = { type: 'error', text: `Invalid JSON: ${jsonError}` };
      return;
    }
    confirmOpen = true;
  }

  async function confirmApply(): Promise<void> {
    confirmOpen = false;
    applying = true;
    statusMessage = null;
    const contentType =
      format === 'xml' ? 'application/yang-data+xml' : 'application/yang-data+json';
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), APPLY_TIMEOUT_MS);
    try {
      await restconfRaw<null>(
        'PATCH',
        'data',
        body,
        contentType,
        false,
        { async: 'true' },
        abortController.signal
      );
      statusMessage = {
        type: 'success',
        text: `Apply request accepted (${format.toUpperCase()}, ${charCount.toLocaleString()} chars)`
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      statusMessage = {
        type: aborted ? 'warning' : 'error',
        text: aborted
          ? 'Apply request was sent, but no RESTCONF response was received within 30 seconds. Check the config queue or device state for completion.'
          : err instanceof Error ? err.message : 'Failed to apply config.'
      };
    } finally {
      window.clearTimeout(timeoutId);
      applying = false;
    }
  }

  function reset(): void {
    body = '';
    statusMessage = null;
  }
</script>

<div class="page">
  <header class="page-header">
    <div>
      <h2>Apply CFS Config</h2>
      <p class="page-header__desc">
        Applies the body through <code>/restconf/data</code>. Paste a JSON or XML payload, or
        drop a file onto the editor.
      </p>
    </div>
    <div class="page-actions">
      <button class="btn btn-secondary" type="button" disabled={!body || applying} onclick={reset}>
        Reset
      </button>
      <button class="btn btn-primary" type="button" disabled={!canApply} onclick={requestApply}>
        {applying ? 'Applying…' : 'Apply'}
      </button>
    </div>
  </header>

  {#if statusMessage}
    <div class="status-banner status-banner--{statusMessage.type}">{statusMessage.text}</div>
  {/if}

  <div class="toolbar">
    <div class="segmented" role="group" aria-label="Body format">
      <button
        type="button"
        class:active={format === 'json'}
        onclick={() => setFormat('json')}
      >
        JSON
      </button>
      <button
        type="button"
        class:active={format === 'xml'}
        onclick={() => setFormat('xml')}
      >
        XML
      </button>
    </div>
    <span class="toolbar__meta">
      {format === 'xml'
        ? 'Content-Type: application/yang-data+xml'
        : 'Content-Type: application/yang-data+json'}
    </span>
    <span class="toolbar__meta toolbar__count">{charCount.toLocaleString()} chars</span>
  </div>

  <div
    class="dropzone"
    class:dragging
    role="textbox"
    tabindex="-1"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <textarea
      class="editor"
      bind:value={body}
      placeholder={format === 'xml'
        ? '<l3vpn-svc xmlns="urn:ietf:params:xml:ns:yang:ietf-l3vpn-svc">\n  ...\n</l3vpn-svc>'
        : '{\n  "ietf-l3vpn-svc:l3vpn-svc": {\n    ...\n  }\n}'}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
    ></textarea>
    {#if dragging}
      <div class="dropzone__overlay">Drop file to load its contents</div>
    {/if}
  </div>
</div>

<ConfirmDialog
  open={confirmOpen}
  title="Apply CFS payload?"
  message="This applies the payload to the orchestrator's root CFS state through /restconf/data. Use a complete payload when bootstrapping an empty system."
  confirmLabel="Apply"
  oncancel={() => (confirmOpen = false)}
  onconfirm={confirmApply}
/>

<style>
  .page {
    display: grid;
    gap: 16px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .page-header__desc {
    margin: 4px 0 0;
    color: var(--sw-text-secondary);
    font-size: 13px;
    max-width: 720px;
  }

  .page-header__desc code {
    color: var(--sw-text-primary);
    font-family: var(--sw-font-mono, ui-monospace, SFMono-Regular, monospace);
  }

  .page-actions {
    display: flex;
    gap: 8px;
  }

  .status-banner {
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 13px;
    word-break: break-word;
  }

  .status-banner--success {
    background: var(--sw-success-dim);
    color: var(--sw-success);
  }

  .status-banner--error {
    background: var(--sw-danger-dim);
    color: var(--sw-danger);
  }

  .status-banner--warning {
    background: var(--sw-warning-dim);
    color: var(--sw-warning);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .toolbar__meta {
    color: var(--sw-text-muted);
    font-size: 12px;
    font-family: var(--sw-font-mono, ui-monospace, SFMono-Regular, monospace);
  }

  .toolbar__count {
    margin-left: auto;
  }

  .segmented {
    display: inline-flex;
    background: var(--sw-bg-elevated);
    border: 1px solid var(--sw-border-subtle);
    border-radius: 6px;
    overflow: hidden;
  }

  .segmented button {
    background: transparent;
    border: 0;
    padding: 5px 14px;
    color: var(--sw-text-secondary);
    font-size: 12px;
    cursor: pointer;
  }

  .segmented button.active {
    background: var(--sw-accent-glow);
    color: var(--sw-accent);
  }

  .segmented button:hover:not(.active) {
    color: var(--sw-text-primary);
  }

  .dropzone {
    position: relative;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-lg, 8px);
    background: var(--sw-bg-card);
    overflow: hidden;
    box-shadow: var(--sw-shadow-card, 0 1px 2px rgba(0, 0, 0, 0.2));
    transition: border-color 120ms ease;
  }

  .dropzone.dragging {
    border-color: var(--sw-accent);
  }

  .editor {
    width: 100%;
    min-height: 480px;
    box-sizing: border-box;
    padding: 14px 16px;
    background: transparent;
    border: 0;
    outline: 0;
    resize: vertical;
    color: var(--sw-text-primary);
    font-family: var(--sw-font-mono, ui-monospace, SFMono-Regular, monospace);
    font-size: 13px;
    line-height: 1.55;
  }

  .editor::placeholder {
    color: var(--sw-text-muted);
  }

  .dropzone__overlay {
    position: absolute;
    inset: 6px;
    border: 2px dashed var(--sw-accent);
    border-radius: var(--sw-radius-md, 6px);
    background: var(--sw-accent-glow);
    color: var(--sw-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    pointer-events: none;
  }
</style>
