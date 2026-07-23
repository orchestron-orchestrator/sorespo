<script lang="ts">
  import { TOUR_STEPS } from '$lib/demo/tour/steps';
  import { backStep, endTour, nextStep, tour } from '$lib/demo/tour/tour-state.svelte';

  interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
  }

  const PADDING = 8;
  const GAP = 14;
  const MARGIN = 12;

  let rect: Rect | null = $state(null);
  let popoverWidth = $state(340);
  let popoverHeight = $state(180);
  let viewportWidth = $state(1280);
  let viewportHeight = $state(800);

  let step = $derived(TOUR_STEPS[tour.index]);
  let isLast = $derived(tour.index === TOUR_STEPS.length - 1);

  function closeEnough(a: Rect | null, b: Rect | null): boolean {
    if (!a || !b) return a === b;
    return (
      Math.abs(a.top - b.top) < 0.5 &&
      Math.abs(a.left - b.left) < 0.5 &&
      Math.abs(a.width - b.width) < 0.5 &&
      Math.abs(a.height - b.height) < 0.5
    );
  }

  // Follow the target element while the tour is active: wait for it to appear
  // after navigation, scroll it into view once, then track its rect every
  // frame so scrolling and window resizes keep the spotlight glued to it.
  $effect(() => {
    if (!tour.active) {
      rect = null;
      return;
    }

    const current = TOUR_STEPS[tour.index];
    let frame = 0;
    let scrolled = false;
    rect = null;

    const tick = () => {
      if (current.target) {
        const el = document.querySelector(`[data-tour="${current.target}"]`);
        if (el) {
          if (!scrolled) {
            scrolled = true;
            el.scrollIntoView({ block: 'center', behavior: 'auto' });
          }
          const measured = el.getBoundingClientRect();
          const next = {
            top: measured.top,
            left: measured.left,
            width: measured.width,
            height: measured.height
          };
          if (!closeEnough(rect, next)) {
            rect = next;
          }
        }
        // If the anchor never appears the popover simply stays centered —
        // the tour must never wedge on a missing/renamed data-tour anchor.
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });

  let spotlightStyle = $derived.by(() => {
    if (!rect) return '';
    return [
      `top: ${rect.top - PADDING}px`,
      `left: ${rect.left - PADDING}px`,
      `width: ${rect.width + PADDING * 2}px`,
      `height: ${rect.height + PADDING * 2}px`
    ].join('; ');
  });

  let popoverStyle = $derived.by(() => {
    if (!rect) {
      return `top: ${Math.max(MARGIN, (viewportHeight - popoverHeight) / 2)}px; left: ${Math.max(
        MARGIN,
        (viewportWidth - popoverWidth) / 2
      )}px;`;
    }

    let top = rect.top + rect.height + PADDING + GAP;
    if (top + popoverHeight > viewportHeight - MARGIN) {
      top = rect.top - PADDING - GAP - popoverHeight;
    }
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, viewportHeight - popoverHeight - MARGIN));

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, viewportWidth - popoverWidth - MARGIN));

    return `top: ${top}px; left: ${left}px;`;
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (!tour.active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      endTour();
    }
  }
</script>

<svelte:window
  onkeydown={handleKeydown}
  bind:innerWidth={viewportWidth}
  bind:innerHeight={viewportHeight}
/>

{#if tour.active && step}
  {#if rect}
    <div class="tour-spotlight" style={spotlightStyle}></div>
  {:else}
    <div class="tour-dim"></div>
  {/if}

  <div
    class="tour-popover card"
    style={popoverStyle}
    role="dialog"
    aria-label={step.title}
    bind:offsetWidth={popoverWidth}
    bind:offsetHeight={popoverHeight}
  >
    <div class="tour-popover__header">
      <h3>{step.title}</h3>
      <span class="tour-popover__count">{tour.index + 1} of {TOUR_STEPS.length}</span>
    </div>
    <p class="tour-popover__body">{step.body}</p>
    <div class="tour-popover__actions">
      <button class="btn btn-ghost btn-sm" type="button" onclick={endTour}>Skip tour</button>
      <div class="tour-popover__nav">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          disabled={tour.index === 0}
          onclick={() => void backStep()}
        >
          Back
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick={() => void nextStep()}>
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-spotlight {
    position: fixed;
    z-index: 1080;
    border-radius: 10px;
    outline: 2px solid var(--sw-accent);
    outline-offset: 0;
    box-shadow: 0 0 0 200vmax rgba(5, 9, 18, 0.72);
    pointer-events: none;
    transition:
      top 160ms ease-out,
      left 160ms ease-out,
      width 160ms ease-out,
      height 160ms ease-out;
  }

  .tour-dim {
    position: fixed;
    inset: 0;
    z-index: 1080;
    background: rgba(5, 9, 18, 0.72);
    pointer-events: none;
  }

  .tour-popover {
    position: fixed;
    z-index: 1090;
    width: min(340px, calc(100vw - 24px));
    display: grid;
    gap: 10px;
    padding: 16px;
    border: 1px solid var(--sw-border-default);
    background: var(--sw-bg-surface);
    box-shadow: var(--sw-shadow-elevated);
    backdrop-filter: blur(6px);
    transition:
      top 160ms ease-out,
      left 160ms ease-out;
  }

  .tour-popover__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .tour-popover__header h3 {
    margin: 0;
    font-size: 14px;
  }

  .tour-popover__count {
    flex-shrink: 0;
    color: var(--sw-text-muted);
    font-family: var(--sw-font-mono);
    font-size: 11px;
  }

  .tour-popover__body {
    margin: 0;
    color: var(--sw-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }

  .tour-popover__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .tour-popover__nav {
    display: flex;
    gap: 8px;
  }
</style>
