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
  restconfRoot: string;
  keyParam: string;
  createDraft(): TDraft;
  parse(input: unknown): TDraft;
  list?(input: unknown): ServiceListItem[];
  validate(draft: TDraft): ValidationResult;
  serialize(draft: TDraft): unknown;
  Editor: Component<{ draft: TDraft; errors: Record<string, string> }>;
  Summary?: Component<{ draft: TDraft }>;
  Preview?: Component<{ draft: TDraft; payload: unknown }>;
}

export type AnyServiceModule = ServiceModule<any>;

export interface ServiceModuleMeta {
  id: string;
  title: string;
  collectionLabel: string;
  description: string;
}
