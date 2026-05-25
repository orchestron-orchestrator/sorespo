export interface NetinfraRouterDraft {
  name: string;
  id: number | null;
  type: string;
  role: string;
  asn: number | null;
  mock: boolean;
  approvalRequired: boolean;
  featureFlags: {
    runtimeSchemaFetch: boolean;
  };
}
