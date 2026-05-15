<script lang="ts">
  interface Props {
    label?: string;
    checked?: boolean;
    help?: string;
    error?: string;
    disabled?: boolean;
    onchange?: (next: boolean) => void;
  }

  let {
    label = '',
    checked = false,
    help = '',
    error = '',
    disabled = false,
    onchange
  }: Props = $props();

  function toggle(): void {
    if (disabled) return;
    onchange?.(!checked);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggle();
    }
  }
</script>

<div class="field-toggle">
  <div class="field-toggle__control">
    <button
      type="button"
      class="toggle"
      class:on={checked}
      class:disabled
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onclick={toggle}
      onkeydown={handleKeydown}
    ></button>
    <span class="field-toggle__label">{label}</span>
  </div>
  {#if help}
    <small class="field-toggle__help">{help}</small>
  {/if}
  {#if error}
    <span class="field-toggle__error">{error}</span>
  {/if}
</div>

<style>
  .field-toggle {
    display: grid;
    gap: 4px;
  }

  .field-toggle__control {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toggle {
    width: 40px;
    height: 22px;
    background: var(--sw-bg-input);
    border: 1px solid var(--sw-border-default);
    border-radius: 11px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    padding: 0;
    outline: none;
  }

  .toggle::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: var(--sw-text-muted);
    border-radius: 50%;
    transition: all 0.2s;
  }

  .toggle:focus-visible {
    box-shadow: 0 0 0 3px var(--sw-accent-glow);
  }

  .toggle.on {
    background: var(--sw-accent-dim);
    border-color: var(--sw-accent);
  }

  .toggle.on::after {
    left: 20px;
    background: var(--sw-accent);
    box-shadow: 0 0 8px var(--sw-accent-glow-strong);
  }

  .toggle.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .field-toggle__label {
    font-size: 13px;
    color: var(--sw-text-primary);
    user-select: none;
  }

  .field-toggle__help {
    font-size: 11px;
    color: var(--sw-text-muted);
    padding-left: 50px;
  }

  .field-toggle__error {
    font-size: 11px;
    color: var(--sw-danger);
    padding-left: 50px;
  }
</style>
