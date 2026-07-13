import type { ValidationResult } from '$lib/core/validation/types';

function cloneDraft<T>(value: T): T {
  const snapshot = $state.snapshot(value) as T;
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }

  return JSON.parse(JSON.stringify(snapshot)) as T;
}

export class DraftStore<TDraft> {
  draft: TDraft = $state()!;
  original: TDraft = $state()!;
  validation: ValidationResult = $state()!;
  #originalJson = $derived(JSON.stringify(this.original));
  dirty = $derived(JSON.stringify(this.draft) !== this.#originalJson);
  #validate: (draft: TDraft) => ValidationResult;

  constructor(initialDraft: TDraft, validate: (draft: TDraft) => ValidationResult) {
    this.#validate = validate;
    const initial = cloneDraft(initialDraft);
    this.draft = initial;
    this.original = cloneDraft(initial);
    this.validation = validate(initial);
  }

  set(next: TDraft): void {
    const cloned = cloneDraft(next);
    this.draft = cloned;
    this.validation = this.#validate(cloned);
  }

  reset(): void {
    const baseline = cloneDraft(this.original);
    this.draft = baseline;
    this.validation = this.#validate(baseline);
  }

  markSaved(snapshot?: TDraft): void {
    this.original = cloneDraft(snapshot ?? this.draft);
  }
}
