import { derived, get, writable } from 'svelte/store';

import type { Readable, Writable } from 'svelte/store';

import type { ValidationResult } from '$lib/core/validation/types';

function cloneDraft<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export interface DraftStore<TDraft> {
  draft: Writable<TDraft>;
  original: Writable<TDraft>;
  validation: Writable<ValidationResult>;
  dirty: Readable<boolean>;
  reset(): void;
  replace(next: TDraft): void;
  set(next: TDraft): void;
  update(updater: (current: TDraft) => TDraft): void;
  markSaved(): void;
}

export function createDraftStore<TDraft>(
  initialDraft: TDraft,
  validate: (draft: TDraft) => ValidationResult
): DraftStore<TDraft> {
  const initial = cloneDraft(initialDraft);
  const draft = writable<TDraft>(initial);
  const original = writable<TDraft>(cloneDraft(initial));
  const validation = writable<ValidationResult>(validate(cloneDraft(initial)));

  const dirty = derived([draft, original], ([$draft, $original]) => {
    return JSON.stringify($draft) !== JSON.stringify($original);
  });

  function refreshValidation(next: TDraft): void {
    validation.set(validate(cloneDraft(next)));
  }

  function set(next: TDraft): void {
    const cloned = cloneDraft(next);
    draft.set(cloned);
    refreshValidation(cloned);
  }

  function replace(next: TDraft): void {
    const cloned = cloneDraft(next);
    draft.set(cloned);
    original.set(cloneDraft(cloned));
    refreshValidation(cloned);
  }

  function reset(): void {
    const baseline = cloneDraft(get(original));
    draft.set(baseline);
    refreshValidation(baseline);
  }

  function update(updater: (current: TDraft) => TDraft): void {
    draft.update((current) => {
      const next = updater(cloneDraft(current));
      refreshValidation(next);
      return next;
    });
  }

  function markSaved(): void {
    original.set(cloneDraft(get(draft)));
  }

  return {
    draft,
    original,
    validation,
    dirty,
    reset,
    replace,
    set,
    update,
    markSaved
  };
}
