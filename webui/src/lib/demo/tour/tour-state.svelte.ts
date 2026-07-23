import { goto } from '$app/navigation';

import { appHref } from '$lib/core/util/nav';
import { TOUR_STEPS } from '$lib/demo/tour/steps';

const DONE_KEY = 'sw-demo-tour-done';

export const tour = $state({ active: false, index: 0 });

export function isTourDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // private mode etc. — the tour will simply auto-start again next visit
  }
}

async function navigateToStep(index: number): Promise<void> {
  const step = TOUR_STEPS[index];
  if (!step) return;
  try {
    await goto(appHref(step.route));
  } catch {
    // navigation failures must never wedge the tour UI
  }
}

export async function startTour(at = 0): Promise<void> {
  tour.index = at;
  tour.active = true;
  await navigateToStep(at);
}

export async function nextStep(): Promise<void> {
  if (tour.index >= TOUR_STEPS.length - 1) {
    endTour();
    return;
  }
  tour.index += 1;
  await navigateToStep(tour.index);
}

export async function backStep(): Promise<void> {
  if (tour.index === 0) return;
  tour.index -= 1;
  await navigateToStep(tour.index);
}

export function endTour(): void {
  tour.active = false;
  markTourDone();
}
