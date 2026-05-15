import type { Component } from 'svelte';

import type { ValidationResult } from '$lib/core/validation/types';

export interface ServiceListItem {
  id: string;
  label: string;
  description?: string;
}

export interface ServiceModule<TDraft = unknown> {
  id: string;
  title: string;
  collectionLabel: string;
  description: string;
  deletable?: boolean;
  collectionRestconfRoot?: string;
  restconfRoot: string;
  keyParam: string;
  keyLabel?: string;
  createDraft(): TDraft;
  parse(input: unknown): TDraft;
  cloneDraft?(draft: TDraft): TDraft;
  list?(input: unknown): ServiceListItem[];
  validate(draft: TDraft): ValidationResult;
  serialize(draft: TDraft): unknown;
  getKey?(draft: TDraft): string;
  getPathKey?(draft: TDraft): string | string[];
  parseRouteId?(id: string): string | string[];
  formatRouteId?(id: string): string;
  Editor: Component<{
    draft: TDraft;
    errors: Record<string, string>;
    validationKey?: number;
    onchange?: (next: TDraft) => void;
    ontouch?: () => void;
  }>;
  Summary?: Component<{ draft: TDraft }>;
  Preview?: Component<{ draft: TDraft; payload: unknown }>;
}

export function getDraftKey<TDraft>(module: ServiceModule<TDraft>, draft: TDraft): string {
  if (module.getKey) {
    return module.getKey(draft).trim();
  }

  const value = (draft as Record<string, unknown>)[module.keyParam];
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value);
}

export function getDraftKeyLabel<TDraft>(module: ServiceModule<TDraft>): string {
  return module.keyLabel ?? module.keyParam;
}

export function getDraftPathKey<TDraft>(module: ServiceModule<TDraft>, draft: TDraft): string | string[] {
  if (module.getPathKey) {
    return module.getPathKey(draft);
  }

  return getDraftKey(module, draft);
}

export function getRoutePathKey<TDraft>(module: ServiceModule<TDraft>, id: string): string | string[] {
  if (module.parseRouteId) {
    return module.parseRouteId(id);
  }

  return id;
}

export function formatServiceRouteId<TDraft>(module: ServiceModule<TDraft>, id: string): string {
  return module.formatRouteId ? module.formatRouteId(id) : id;
}

export type AnyServiceModule = ServiceModule<any>;

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function createClonedDraft<TDraft>(module: ServiceModule<TDraft>, source: TDraft): TDraft {
  const cloned = cloneValue(source);

  if (module.cloneDraft) {
    return module.cloneDraft(cloned);
  }

  if (cloned && typeof cloned === 'object') {
    const draftRecord = cloned as Record<string, unknown>;

    if (module.keyParam in draftRecord) {
      draftRecord[module.keyParam] = '';
    }
  }

  return cloned;
}

export interface ServiceModuleMeta {
  id: string;
  title: string;
  collectionLabel: string;
  description: string;
}
