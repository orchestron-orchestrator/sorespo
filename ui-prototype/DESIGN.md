# StratoWeave UI Component Design Document

**Status:** Draft
**Prototype:** [`ui-prototype/index.html`](./index.html)

---

## 1. Overview

This document specifies a Svelte component library for StratoWeave's YANG-driven
web UI. The rendering pipeline has three layers:

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ YANG Schema  │──LLM──▶  Layout Descriptor │──user──▶  Rendered Form   │
│ Descriptor   │ skill │  (generated)       │ edits  │  (Svelte)        │
└─────────────┘       └──────────────────┘       └──────────────────┘
```

1. **YANG Schema Descriptor** (section 3) — a JSON representation of the YANG
   model: types, constraints, tree structure. This is the source of truth for
   *what* data exists. Produced by the backend or a build-time tool.

2. **Layout Descriptor** (section 4) — a JSON document describing *how* the
   form should be presented: field ordering, grouping, column spans, wizard
   steps, which containers start collapsed, custom labels. An LLM skill
   generates a sensible default from the schema; end users can then customize
   it through a visual editor or direct JSON editing.

3. **Svelte Components** (section 5) — the reusable building blocks.
   `YangForm` consumes both the schema descriptor and the layout descriptor
   to render the final UI.

The existing `webui/` application (Svelte 4, Vite 5, svelte-routing) provides
the shell. The components defined here extend it with a design system and
YANG-aware form primitives.

---

## 2. Design Tokens (CSS Custom Properties)

All visual values flow through CSS custom properties defined in a single
`theme.css` file, imported in `app.css`. No hardcoded colours or font
stacks in component `<style>` blocks.

```css
/* webui/src/theme.css */

:root {
  /* ── Surface hierarchy ── */
  --sw-bg-deep:       #0a0e14;
  --sw-bg-surface:    #111820;
  --sw-bg-card:       #161e28;
  --sw-bg-elevated:   #1c2632;
  --sw-bg-input:      #0d1219;

  /* ── Borders ── */
  --sw-border-subtle:  #1e2a38;
  --sw-border-default: #263040;
  --sw-border-focus:   #2dd4bf;

  /* ── Text ── */
  --sw-text-primary:   #e2e8f0;
  --sw-text-secondary: #8899aa;
  --sw-text-muted:     #556677;
  --sw-text-label:     #a0b0c0;

  /* ── Accent ── */
  --sw-accent:            #2dd4bf;
  --sw-accent-dim:        #1a8a7a;
  --sw-accent-glow:       rgba(45, 212, 191, 0.15);
  --sw-accent-glow-strong:rgba(45, 212, 191, 0.30);

  /* ── Semantic ── */
  --sw-danger:   #ef4444;
  --sw-success:  #22c55e;
  --sw-warning:  #f59e0b;
  --sw-info:     #3b82f6;

  /* ── Radii ── */
  --sw-radius-sm: 4px;
  --sw-radius-md: 8px;
  --sw-radius-lg: 12px;

  /* ── Typography ── */
  --sw-font-sans: 'DM Sans', system-ui, sans-serif;
  --sw-font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* ── Shadows ── */
  --sw-shadow-card:     0 2px 12px rgba(0,0,0,0.3);
  --sw-shadow-elevated: 0 8px 32px rgba(0,0,0,0.4);

  /* ── Layout ── */
  --sw-sidebar-width: 240px;
  --sw-header-height: 56px;
}
```

Every component references these with `var(--sw-*)`.

---

## 3. YANG Schema Descriptor

Components do not parse `.yang` files. The backend (or a build-time tool)
produces a JSON descriptor per YANG module. Components consume this descriptor.

### 3.1 Descriptor shape

```ts
/** One entry per YANG node rendered in the UI. */
interface YangNode {
  /** YANG node kind */
  kind: 'leaf' | 'leaf-list' | 'container' | 'list' | 'choice' | 'case';

  /** Schema path, e.g. "/netinfra:netinfra/router/name" */
  path: string;

  /** Human-readable label derived from the YANG node name */
  label: string;

  /** YANG description string (tooltip / help text) */
  description?: string;

  /** Base YANG type or resolved typedef, e.g. "string", "uint32",
      "inet:ipv4-address", "inet:as-number", "boolean", "enumeration",
      "identityref", "leafref", "decimal64", "union" */
  type?: string;

  /** For numeric types: { min, max }.
      For decimal64: { fractionDigits, min, max }.
      For string: { pattern?, length? }.
      For enumeration: string[] of enum names.
      For identityref: { base: string, values: string[] }.
      For leafref: { path: string } (the YANG leafref path expression). */
  typeInfo?: Record<string, any>;

  /** True when YANG says `mandatory true` */
  mandatory?: boolean;

  /** Default value if the YANG node declares one */
  default?: string | number | boolean;

  /** Ordered child nodes (for container, list, case) */
  children?: YangNode[];

  /** For `list`: array of key leaf names */
  keys?: string[];

  /** For `choice`: array of case nodes */
  cases?: YangNode[];

  /** YANG `when` expression (display condition) */
  when?: string;

  /** YANG `if-feature` names */
  ifFeature?: string[];

  /** sw:transform annotation from StratoWeave extensions */
  transform?: string;

  /** tmf:cfs-service annotation */
  cfsService?: string;
}
```

### 3.2 Example: `netinfra:router`

```json
{
  "kind": "list",
  "path": "/netinfra:netinfra/router",
  "label": "Router",
  "description": "Network Infrastructure Router",
  "keys": ["name"],
  "transform": "sorespo.cfs.Router",
  "cfsService": "Router",
  "children": [
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/name",
      "label": "Name",
      "type": "string",
      "mandatory": false
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/id",
      "label": "ID",
      "type": "uint32",
      "description": "router id",
      "mandatory": true
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/type",
      "label": "Type",
      "type": "string",
      "mandatory": true
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/role",
      "label": "Role",
      "type": "string"
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/asn",
      "label": "ASN",
      "type": "inet:as-number",
      "mandatory": true
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/mock",
      "label": "Mock",
      "type": "boolean",
      "default": false
    },
    {
      "kind": "leaf",
      "path": "/netinfra:netinfra/router/approval-required",
      "label": "Approval Required",
      "type": "boolean",
      "default": false
    },
    {
      "kind": "container",
      "path": "/netinfra:netinfra/router/feature-flags",
      "label": "Feature Flags",
      "children": [
        {
          "kind": "leaf",
          "path": "/netinfra:netinfra/router/feature-flags/runtime-schema-fetch",
          "label": "Runtime Schema Fetch",
          "type": "boolean",
          "default": false
        }
      ]
    }
  ]
}
```

---

## 4. Layout Descriptor

The layout descriptor controls *presentation* — everything about how a form
looks and flows that is not already determined by the YANG schema itself. An
LLM skill generates the initial layout; users can override any part of it.

### 4.1 Descriptor shape

```ts
interface LayoutDescriptor {
  /** Which YANG module + path this layout targets */
  schemaPath: string;             // e.g. "/netinfra:netinfra/router"

  /** Display title (can override the YANG label) */
  title?: string;

  /** Overall page style */
  pageType: 'form' | 'wizard' | 'table';

  /** For wizard pageType: defines steps */
  wizard?: WizardLayout;

  /** For form/table: the root group */
  root: LayoutGroup;

  /** Layout format version (for migration) */
  version: 1;
}

interface LayoutGroup {
  /** Unique id for this group (stable across edits) */
  id: string;

  /** Display label for the group header */
  label?: string;

  /** How this group renders */
  display: 'section'           // card with header
         | 'collapsible'       // expandable section
         | 'inline'            // no visual wrapper, fields flow into parent
         | 'tabs';             // tabbed sub-groups

  /** For 'collapsible': default open/closed */
  defaultOpen?: boolean;

  /** Grid columns for leaf fields inside this group (1-4, default 2) */
  columns?: number;

  /** Ordered members — either field references or nested groups */
  members: (LayoutField | LayoutGroup)[];
}

interface LayoutField {
  /** Reference to a YANG schema path */
  path: string;                   // e.g. "/netinfra:netinfra/router/asn"

  /** Override the label from the schema */
  label?: string;

  /** Override the placeholder text */
  placeholder?: string;

  /** Column span within the parent group's grid (default 1) */
  span?: number;

  /** Force a specific widget instead of the auto-detected one.
      e.g. force 'tabs' for an identityref that would normally
      get a dropdown, or 'textarea' for a long string. */
  widget?: string;

  /** For identityref/enum: override which values to show or hide */
  visibleValues?: string[];

  /** Whether this field should appear in the list/table summary view */
  showInSummary?: boolean;

  /** Custom help text (overrides YANG description) */
  helpText?: string;

  /** Display this field as read-only even in edit mode */
  readonly?: boolean;

  /** Hide this field entirely (data still submitted, just not shown) */
  hidden?: boolean;
}

interface WizardLayout {
  steps: WizardStep[];
}

interface WizardStep {
  id: string;
  label: string;
  /** The layout group rendered in this step */
  group: LayoutGroup;
}
```

### 4.2 Example: layout for `netinfra:router`

```json
{
  "schemaPath": "/netinfra:netinfra/router",
  "title": "Router Configuration",
  "pageType": "form",
  "version": 1,
  "root": {
    "id": "root",
    "display": "inline",
    "columns": 2,
    "members": [
      {
        "id": "identity-group",
        "label": "Identity",
        "display": "section",
        "columns": 2,
        "members": [
          { "path": "/netinfra:netinfra/router/name", "span": 1, "placeholder": "e.g., pe-ams-01" },
          { "path": "/netinfra:netinfra/router/id", "span": 1 },
          { "path": "/netinfra:netinfra/router/type", "span": 1, "placeholder": "e.g., SR Linux" },
          { "path": "/netinfra:netinfra/router/role", "span": 1, "placeholder": "e.g., PE, P, RR" }
        ]
      },
      {
        "id": "network-group",
        "label": "Network",
        "display": "section",
        "columns": 1,
        "members": [
          { "path": "/netinfra:netinfra/router/asn" }
        ]
      },
      {
        "id": "flags-group",
        "label": "Flags",
        "display": "section",
        "columns": 2,
        "members": [
          { "path": "/netinfra:netinfra/router/mock" },
          { "path": "/netinfra:netinfra/router/approval-required" }
        ]
      },
      {
        "id": "feature-flags",
        "label": "Feature Flags",
        "display": "collapsible",
        "defaultOpen": false,
        "columns": 1,
        "members": [
          { "path": "/netinfra:netinfra/router/feature-flags/runtime-schema-fetch" }
        ]
      }
    ]
  }
}
```

### 4.3 Example: wizard layout for `ietf-l3vpn-svc`

```json
{
  "schemaPath": "/ietf-l3vpn-svc:l3vpn-svc",
  "title": "L3VPN Service",
  "pageType": "wizard",
  "version": 1,
  "wizard": {
    "steps": [
      {
        "id": "profiles",
        "label": "VPN Profiles",
        "group": {
          "id": "profiles-root",
          "display": "inline",
          "columns": 1,
          "members": [
            { "path": "/ietf-l3vpn-svc:l3vpn-svc/vpn-profiles/valid-provider-identifiers/qos-profile-identifier" },
            { "path": "/ietf-l3vpn-svc:l3vpn-svc/vpn-profiles/valid-provider-identifiers/bfd-profile-identifier" }
          ]
        }
      },
      {
        "id": "vpn-service",
        "label": "VPN Service",
        "group": {
          "id": "vpn-svc-root",
          "display": "inline",
          "columns": 2,
          "members": [
            { "path": ".../vpn-service/vpn-id", "span": 1 },
            { "path": ".../vpn-service/customer-name", "span": 1 },
            { "path": ".../vpn-service/vpn-service-topology", "widget": "tabs" },
            {
              "id": "multicast-section",
              "label": "Multicast",
              "display": "collapsible",
              "defaultOpen": false,
              "members": [
                { "path": ".../multicast/enabled" },
                { "path": ".../multicast/customer-tree-flavors/tree-flavor" }
              ]
            }
          ]
        }
      },
      {
        "id": "sites",
        "label": "Sites",
        "group": { "id": "sites-root", "display": "inline", "members": [] }
      },
      {
        "id": "ip-connection",
        "label": "IP Connection",
        "group": {
          "id": "ip-root",
          "display": "tabs",
          "members": [
            { "id": "ipv4-tab", "label": "IPv4", "display": "inline", "members": [] },
            { "id": "ipv6-tab", "label": "IPv6", "display": "inline", "members": [] },
            { "id": "oam-tab",  "label": "OAM / BFD", "display": "inline", "members": [] }
          ]
        }
      },
      {
        "id": "routing",
        "label": "Routing",
        "group": { "id": "routing-root", "display": "inline", "members": [] }
      }
    ]
  }
}
```

### 4.4 Schema + Layout merge rules

`YangForm` merges the two descriptors at render time:

1. **Schema is authoritative for data types and constraints.** The layout
   cannot change a field's type, make a mandatory field optional, or alter
   validation ranges.

2. **Layout controls presentation.** Field ordering, grouping, column spans,
   labels, placeholders, widget overrides, and visibility.

3. **Unmentioned fields fall through.** If a YANG leaf exists in the schema
   but is not referenced in the layout, it renders at the end of the nearest
   matching group using default rules (auto-detected widget, 1-column span).
   This ensures the layout never silently drops data fields.

4. **`hidden: true` suppresses rendering but not data.** The field's value
   is still included in the submitted data object with its default (or
   previously set) value.

---

### 4.5 LLM Layout Generator

An LLM skill (or CLI tool) reads a YANG Schema Descriptor and produces a
Layout Descriptor. This is run once per model (or when the model changes)
and the output is stored as a JSON file that users can further customize.

### 4.5.1 Pipeline

```
                  ┌─────────────────┐
  .yang file ───▶ │ YANG parser     │──▶ YangNode (schema descriptor JSON)
                  │ (backend/build) │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ LLM Layout Skill│──▶ LayoutDescriptor JSON
                  │ (Claude / tool) │        │
                  └─────────────────┘        │
                                             ▼
                                    ┌────────────────┐
                                    │ Layout Editor   │──▶ customised LayoutDescriptor
                                    │ (user, in-app)  │
                                    └────────────────┘
```

### 4.5.2 LLM skill prompt structure

The skill receives the schema descriptor as input and returns a layout
descriptor. The prompt instructs the LLM to make presentation decisions
that a human designer would make:

**Input to the skill:**
- The full `YangNode` schema descriptor JSON
- The target `pageType` (`form`, `wizard`, or `table`) — or `auto` to let
  the LLM decide based on model complexity
- Optional user instructions (e.g., "put IP addressing on its own step",
  "group all boolean flags together")

**Decisions the skill makes:**

| Decision | Heuristic |
|---|---|
| **Page type** | Simple containers/lists → `form`. Deep models with 3+ levels or &gt;20 fields → `wizard`. Lists where the main interaction is browsing → `table`. |
| **Wizard step boundaries** | Group by top-level containers or by functional domain (identity, connectivity, routing, security). Target 3–7 steps. |
| **Field grouping** | Cluster semantically related fields. Put key fields first. Group booleans/flags together. Separate networking fields (IPs, ASNs) from metadata (names, descriptions). |
| **Column layout** | Short fields (booleans, small numbers, enums) → 2 or 3 columns. Wide fields (IP addresses, descriptions) → 1 column or `span: 2`. |
| **Collapsible vs inline** | Containers with &le;2 children → `inline`. Containers with optional/advanced fields → `collapsible` (default closed). Containers with mandatory fields → `collapsible` (default open) or `section`. |
| **Widget overrides** | `identityref` with &le;5 values → `tabs`. `identityref` with &gt;5 → `dropdown`. Long `string` descriptions → `textarea`. |
| **Labels & placeholders** | Convert YANG kebab-case names to title case. Generate contextual placeholders (e.g., "e.g., pe-ams-01" for router names, "e.g., 10.0.0.1" for IPv4 addresses). |
| **Summary columns** | For list/table views: pick key fields + 2–3 most informative leaves for the summary row. |

**Output:** A complete `LayoutDescriptor` JSON.

### 4.5.3 Example skill invocation

```
Generate a StratoWeave layout descriptor for the following YANG schema.

Page type: auto
User instructions: "Group the boolean flags into an 'Options' section.
                    Put ASN next to the router name."

Schema:
<< netinfra:router YangNode JSON >>
```

### 4.5.4 Regeneration and diffing

When a YANG model changes (e.g., a leaf is added), the skill can be re-run.
The tool should:

1. Generate a fresh layout from the updated schema.
2. Diff against the existing (possibly user-customized) layout.
3. Present the diff to the user: new fields are appended to a sensible
   group, removed fields are dropped, existing customizations are preserved.

This is a three-way merge: `old generated` + `user edits` + `new generated`.
The merge strategy:

- **New schema fields** not in the old layout → insert into the group the
  LLM suggests, at the position it suggests.
- **Removed schema fields** → remove from layout, warn user if they had
  customizations on that field.
- **User-modified fields** (label, span, widget, etc.) → keep user's version
  even if the LLM would now suggest something different.
- **User-created groups** (groups with no schema counterpart) → preserve.

### 4.5.5 Storing layouts

```
webui/src/
  layouts/
    netinfra-router.layout.json
    netinfra-backbone-link.layout.json
    ietf-l3vpn-svc.layout.json
    ...
```

Layouts are committed to the repository. They are static assets loaded at
page init alongside the schema descriptor.

Per-user customizations (if the application supports user accounts) are
stored separately and merged on top at runtime:

```
GET /api/layout/{schemaPath}          → base layout (from file)
GET /api/layout/{schemaPath}?user=X   → base + user overlay merged
PUT /api/layout/{schemaPath}          → save user overlay
```

---

### 4.6 Layout Editor (User Customization)

End users can customize the generated layout through an in-app editor.

### 4.6.1 Capabilities

Users can:

- **Reorder fields** within a group (drag-and-drop).
- **Move fields** between groups (drag across sections).
- **Resize fields** (change column span: 1, 2, or full-width).
- **Rename labels** (override the generated or YANG-derived label).
- **Change group display** (switch between section/collapsible/inline/tabs).
- **Collapse/expand defaults** (set whether a collapsible starts open or closed).
- **Hide fields** (toggle `hidden`, the field still submits its default value).
- **Override widgets** (e.g., force an identityref from tabs to dropdown).
- **Add/remove wizard steps** (for wizard page types).
- **Move fields between wizard steps.**
- **Edit placeholders and help text.**

Users **cannot**:

- Change field types or validation rules (those come from the YANG schema).
- Remove mandatory fields (they can hide them, but the field still submits).
- Add fields that don't exist in the schema.

### 4.6.2 Editor UI

The layout editor is a modal overlay or a dedicated route (`/layout-editor/:schemaPath`).
It renders the form in a "design mode" where:

- Each field and group has a subtle dashed border and a drag handle.
- Hovering a field shows a small toolbar: [Resize] [Edit] [Hide] [Drag].
- Groups have a header toolbar: [Rename] [Change Display] [Add Field] [Delete Group].
- A sidebar lists all schema fields not currently placed in the layout
  (the "field palette") — users can drag them into groups.
- Wizard steps are shown as reorderable tabs with [+] and [×] controls.

### 4.6.3 Editor component

```svelte
<LayoutEditor
  schema={yangSchema}
  bind:layout={layoutDescriptor}
  on:save={handleSaveLayout}
  on:reset={handleResetToGenerated}
/>
```

| Prop | Type |
|---|---|
| `schema` | `YangNode` |
| `layout` | `LayoutDescriptor` |

| Event | Detail |
|---|---|
| `save` | `{ layout: LayoutDescriptor }` — user clicked save. |
| `reset` | `{}` — user wants to discard customizations and regenerate. |

### 4.6.4 Reset and regenerate

The editor provides two reset options:

- **Reset to generated default:** Discards all user customizations and loads
  the LLM-generated layout from the committed file.
- **Regenerate from schema:** Re-runs the LLM skill and produces a fresh
  layout (useful after a YANG model change). User is shown a diff preview
  before accepting.

### 4.6.5 Persistence model

```
┌─────────────────────────────────────────────────┐
│                  Effective Layout                │
│                                                  │
│   base layout         user overlay               │
│   (committed JSON) +  (per-user, API-stored)     │
│                    =  merged at runtime           │
└─────────────────────────────────────────────────┘
```

The user overlay only stores the *differences* from the base layout (changed
labels, reordered members, span overrides, etc.), not a full copy. This keeps
overlays small and makes base layout updates easy to absorb.

---

## 5. Component Catalogue

### 5.1 Directory structure

```
webui/src/
  lib/
    theme.css                        ← design tokens
    yang/
      types.js                       ← shared type constants, validators
      context.js                     ← Svelte context for schema + data + layout
      layout-merge.js                ← merges schema + layout + user overlay
    components/
      form/
        YangForm.svelte              ← top-level: renders schema + layout
        YangField.svelte             ← dispatcher: picks widget by type
        StringInput.svelte
        NumberInput.svelte
        BooleanToggle.svelte
        IpAddressInput.svelte
        IpPrefixInput.svelte
        AsNumberInput.svelte
        EnumSelect.svelte
        IdentitySelector.svelte
        IdentityTabs.svelte
        LeafrefSelect.svelte
        Decimal64Input.svelte
      layout/
        Collapsible.svelte           ← container → collapsible section
        ChoiceCaseTabs.svelte         ← choice/case → tab switcher
        LayoutGroup.svelte            ← renders a LayoutGroup node
        FormRow.svelte               ← grid row (2, 3, 4 column)
        SectionDivider.svelte
        TabGroup.svelte              ← renders display:"tabs" groups
      list/
        YangList.svelte              ← list → table or card view
        ListItem.svelte
        AddItemButton.svelte
      nav/
        Sidebar.svelte
        YangPathBreadcrumb.svelte
        WizardStepper.svelte
      feedback/
        StatusBadge.svelte
        ValidationIcon.svelte
        EmptyState.svelte
      overlay/
        Modal.svelte
        JsonPreview.svelte
      editor/
        LayoutEditor.svelte          ← top-level layout customization UI
        FieldPalette.svelte          ← unplaced fields sidebar
        FieldToolbar.svelte          ← per-field edit/resize/hide controls
        GroupToolbar.svelte          ← per-group rename/display/delete
        DragDropZone.svelte          ← reorderable container
        LayoutDiffPreview.svelte     ← shows diff when regenerating
  layouts/
    netinfra-router.layout.json
    netinfra-backbone-link.layout.json
    ietf-l3vpn-svc.layout.json
```

### 5.2 Component specifications

Each specification below lists **props**, **events**, **slots**, and
**behaviour**.

---

#### `YangForm`

The root component. Given a schema descriptor, a layout descriptor, and a data
object, it renders the full form. The layout controls grouping, ordering, and
presentation; the schema controls types and validation.

```svelte
<YangForm
  schema={routerSchema}
  layout={routerLayout}
  bind:data={routerData}
  readonly={false}
  on:submit={handleSave}
  on:validate={handleValidation}
/>
```

| Prop | Type | Description |
|---|---|---|
| `schema` | `YangNode` | Root node of the schema (types, constraints, tree). |
| `layout` | `LayoutDescriptor \| null` | Presentation descriptor. When `null`, the component falls back to automatic layout using the schema structure directly (2-column default, containers as collapsibles, choices as tabs). |
| `data` | `object` | Two-way bound data object. Keys match YANG leaf names. |
| `readonly` | `boolean` | When true, all fields render as read-only text. Default `false`. |
| `errors` | `Record<string, string>` | External validation errors keyed by YANG path. |
| `resolvers` | `Record<string, any[]>` | Data for leafref resolution (see [section 6](#6-leafref-resolution)). |

| Event | Detail |
|---|---|
| `submit` | `{ data, schema }` — fires when the user clicks save. |
| `validate` | `{ path, value, valid, message }` — fires on every field change. |

**Rendering algorithm:**

1. If `layout` is provided: iterate `layout.root.members` (or
   `layout.wizard.steps` for wizard pageType). For each `LayoutGroup`,
   render a `LayoutGroup` component. For each `LayoutField`, look up the
   corresponding `YangNode` by `path` in the schema, then render a
   `YangField` with the layout overrides (label, span, widget, placeholder)
   applied on top of the schema defaults.

2. If `layout` is `null`: fall back to the automatic behaviour — iterate
   `schema.children`, group into `FormRow` (2-column default), wrap
   `container` children in `Collapsible`, wrap `choice` nodes in
   `ChoiceCaseTabs`.

3. **Fallthrough fields:** After processing all layout members, check for
   schema fields not referenced in the layout. Render these at the end of
   the form in an "Additional Fields" section using default rules. This
   guarantees no data field is silently dropped.

4. Passes `resolvers` and `schema` down through Svelte context so deeply
   nested components can access them.

---

#### `YangField`

Dispatcher component. Reads the `YangNode.type` and delegates to the matching
widget.

```svelte
<YangField node={leafNode} bind:value={data[leafNode.label]} />
```

**Type → Widget mapping:**

| `node.type` | Component | Notes |
|---|---|---|
| `string` | `StringInput` | |
| `uint8`, `uint16`, `uint32`, `uint64`, `int8`...`int64` | `NumberInput` | Passes `min`/`max` from `typeInfo` |
| `boolean` | `BooleanToggle` | |
| `inet:ipv4-address` | `IpAddressInput` | version=4 |
| `inet:ipv6-address` | `IpAddressInput` | version=6 |
| `inet:ipv4-prefix` | `IpPrefixInput` | version=4 |
| `inet:ipv6-prefix` | `IpPrefixInput` | version=6 |
| `inet:as-number` | `AsNumberInput` | |
| `enumeration` | `EnumSelect` | Options from `typeInfo.values` |
| `identityref` | `IdentityTabs` or `IdentitySelector` | Tabs if &le;5 options, dropdown if &gt;5 |
| `leafref` | `LeafrefSelect` | Resolves via context |
| `decimal64` | `Decimal64Input` | `fractionDigits` from `typeInfo` |
| `union` | Renders first matching sub-type or falls back to `StringInput` |

**Label rendering:**
Every field label includes:
- The label text from `node.label`
- A red `*` when `node.mandatory` is true
- A monospace `yang-type` tag showing `node.type` (right-aligned)

---

#### `StringInput`

Basic text input.

```svelte
<StringInput
  label="Name"
  bind:value
  placeholder="e.g., pe-ams-01"
  mandatory={true}
  yangType="string"
  mono={true}
  error={null}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Field label |
| `value` | `string` | `''` | Two-way bound value |
| `placeholder` | `string` | `''` | Input placeholder |
| `mandatory` | `boolean` | `false` | Shows required indicator |
| `yangType` | `string` | `null` | Displayed in the type tag |
| `mono` | `boolean` | `false` | Use monospace font for the input |
| `readonly` | `boolean` | `false` | Render as plain text |
| `error` | `string\|null` | `null` | Error message to display |
| `pattern` | `string\|null` | `null` | Regex pattern for validation |

**Validation:** On blur, checks `mandatory` (non-empty) and `pattern` (if set).
Sets internal error state and dispatches `validate` event.

---

#### `NumberInput`

Numeric input with range constraints.

```svelte
<NumberInput
  label="Router ID"
  bind:value
  mandatory={true}
  yangType="uint32"
  min={0}
  max={4294967295}
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `value` | `number\|null` | `null` |
| `mandatory` | `boolean` | `false` |
| `yangType` | `string` | `null` |
| `min` | `number\|null` | `null` |
| `max` | `number\|null` | `null` |
| `step` | `number` | `1` |
| `default` | `number\|null` | `null` |

**Validation:** Checks mandatory, min/max range. Displays range in hint text
as `Range: {min} — {max}`.

---

#### `BooleanToggle`

Toggle switch for `boolean` leaves.

```svelte
<BooleanToggle
  label="Mock Mode"
  bind:value
  yangType="boolean"
  description="default: false"
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `value` | `boolean` | `false` |
| `yangType` | `string` | `null` |
| `description` | `string` | `null` |
| `disabled` | `boolean` | `false` |

**Markup:**
```html
<div class="toggle-wrap">
  <button class="toggle" class:on={value} on:click={() => value = !value} />
  <span class="toggle-label">{label}</span>
</div>
```

**States:** Off (grey knob, dark track) / On (accent knob with glow, tinted
track). The toggle must be keyboard-accessible (`role="switch"`,
`aria-checked`).

---

#### `IpAddressInput`

Validates IPv4 or IPv6 address format inline.

```svelte
<IpAddressInput
  label="Provider Address"
  bind:value
  version={4}
  yangType="inet:ipv4-address"
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `value` | `string` | `''` |
| `version` | `4 \| 6` | `4` |
| `mandatory` | `boolean` | `false` |
| `yangType` | `string` | `null` |

**Validation (IPv4):** Match against
`/^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/`.
Show per-octet error messages ("Octet N out of range").

**Validation (IPv6):** Accept any valid abbreviated or full form. Use a
well-tested regex or a small parser function in `types.js`.

**Visual:** Monospace font, with a `ValidationIcon` (green check / red bang)
to the right of the input.

---

#### `IpPrefixInput`

Composite input: address + `/` divider + prefix length.

```svelte
<IpPrefixInput
  label="Network Prefix"
  bind:address
  bind:prefixLength
  version={4}
  yangType="inet:ipv4-prefix"
/>
```

| Prop | Type | Default |
|---|---|---|
| `address` | `string` | `''` |
| `prefixLength` | `number\|null` | `null` |
| `version` | `4 \| 6` | `4` |
| `mandatory` | `boolean` | `false` |

**Markup:** Three elements in a flex row with collapsed borders (the
`prefix-composite` pattern from the prototype):

```
┌──────────────┬───┬─────┐
│ 10.0.0.0     │ / │ 24  │
└──────────────┴───┴─────┘
```

The prefix length field has `min=0` and `max=32` (v4) or `max=128` (v6).

---

#### `AsNumberInput`

Input for `inet:as-number` (0 — 4,294,967,295).

```svelte
<AsNumberInput label="ASN" bind:value mandatory={true} />
```

Wraps `NumberInput` with `min=0`, `max=4294967295`, and adds a hint
showing the private-range bands (64512-65534, 4200000000-4294967294).

---

#### `Decimal64Input`

For YANG `decimal64` types.

```svelte
<Decimal64Input
  label="Rate Limit"
  bind:value
  fractionDigits={5}
  min={0}
  max={100}
  units="percent"
/>
```

| Prop | Type | Default |
|---|---|---|
| `fractionDigits` | `number` | `2` |
| `min` | `number\|null` | `null` |
| `max` | `number\|null` | `null` |
| `units` | `string\|null` | `null` |

Renders the `units` string as a suffix label next to the input.

---

#### `EnumSelect`

Dropdown for YANG `enumeration` types.

```svelte
<EnumSelect
  label="Signalling Type"
  bind:value
  options={['ldp', 'bgp']}
  default="bgp"
/>
```

Uses a native `<select>` styled with the custom dropdown arrow.

---

#### `IdentityTabs`

Tab-row selector for `identityref` with few values (&le;5).

```svelte
<IdentityTabs
  label="VPN Topology"
  bind:value
  options={['any-to-any', 'hub-spoke', 'hub-spoke-disjoint']}
  yangType="identityref -> vpn-topology"
/>
```

**Markup:** A row of pill buttons inside a dark recessed container. Only one
active at a time (radio behaviour).

---

#### `IdentitySelector`

Dropdown for `identityref` with many values (&gt;5).

```svelte
<IdentitySelector
  label="Customer Application"
  bind:value
  options={['web','mail','file-transfer','database', ...]}
  yangType="identityref -> customer-application"
/>
```

Renders as a styled `<select>`. The switching logic between `IdentityTabs`
and `IdentitySelector` lives in `YangField` based on option count.

---

#### `LeafrefSelect`

Dropdown whose options come from another YANG list.

```svelte
<LeafrefSelect
  label="Left Router"
  bind:value
  path="/netinfra:netinfra/router/name"
  yangType="leafref"
/>
```

| Prop | Type |
|---|---|
| `label` | `string` |
| `value` | `string` |
| `path` | `string` |
| `mandatory` | `boolean` |

**Resolution:** Reads available values from Svelte context
(`getContext('yang-resolvers')`), keyed by the leafref target path. The
parent `YangForm` populates this context with the `resolvers` prop.

**Visual:** The dropdown has a small "leafref" badge floated inside the select
to indicate the value is a reference.

---

#### `Collapsible`

Wraps a YANG `container` in an expandable section.

```svelte
<Collapsible title="Feature Flags" yangPath="container" open={false}>
  <!-- children -->
</Collapsible>
```

| Prop | Type | Default |
|---|---|---|
| `title` | `string` | — |
| `yangPath` | `string\|null` | `null` |
| `open` | `boolean` | `false` |

| Slot | Description |
|---|---|
| default | Content rendered when open |

**Behaviour:** Clicking the header toggles open/closed. The arrow rotates
90 degrees. The `yangPath` is displayed right-aligned in monospace as a
context hint.

Collapsibles can nest (e.g. security > encryption > encryption-profile).

---

#### `ChoiceCaseTabs`

Renders YANG `choice` with `case` children as a tab switcher. Selecting a
tab shows only that case's children.

```svelte
<ChoiceCaseTabs
  cases={[
    { name: 'provider-dhcp', label: 'Provider DHCP', node: dhcpNode },
    { name: 'dhcp-relay',    label: 'DHCP Relay',    node: relayNode },
    { name: 'static',        label: 'Static Address', node: staticNode },
  ]}
  bind:activeCase
/>
```

| Prop | Type |
|---|---|
| `cases` | `{ name: string, label: string, node: YangNode }[]` |
| `activeCase` | `string` |

When `activeCase` changes:
1. The corresponding case tab gets the `.active` class.
2. Only children of the active case's `node` are rendered.
3. Values from inactive cases are preserved in the data object (not cleared)
   so switching back restores previous input.

---

#### `LayoutGroup`

Renders one `LayoutGroup` node from the layout descriptor. Delegates to the
appropriate visual wrapper based on the `display` property.

```svelte
<LayoutGroup
  group={layoutGroup}
  schemaMap={schemaNodesByPath}
  bind:data
/>
```

| Prop | Type | Description |
|---|---|---|
| `group` | `LayoutGroup` | The layout group to render. |
| `schemaMap` | `Map<string, YangNode>` | Lookup map from schema path to `YangNode`, built by `YangForm`. |
| `data` | `object` | Two-way bound data object. |

**Behaviour by `display` value:**

| `display` | Renders as |
|---|---|
| `section` | A `Card` with a header showing `group.label`. |
| `collapsible` | A `Collapsible` with `open={group.defaultOpen}`. |
| `inline` | No visual wrapper — children flow into the parent's grid. |
| `tabs` | A `TabGroup` where each child group is a tab pane. |

For each member in `group.members`:
- If it's a `LayoutField` (has a `path`): look up the `YangNode` in
  `schemaMap`, create a `YangField` with layout overrides.
- If it's a nested `LayoutGroup` (has `members`): recurse with another
  `LayoutGroup` component.

The group creates a CSS grid with `group.columns` columns. Each `YangField`
uses `grid-column: span N` based on `field.span` (default 1).

---

#### `YangList`

Renders a YANG `list` as either a table or a card list.

```svelte
<YangList
  schema={routerListSchema}
  bind:items={routers}
  view="table"
  on:add={handleAdd}
  on:edit={handleEdit}
  on:delete={handleDelete}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `schema` | `YangNode` | — | The `list` node. `schema.keys` defines key columns. |
| `items` | `any[]` | `[]` | Array of data objects, one per list entry. |
| `view` | `'table' \| 'cards'` | `'table'` | Display mode. |
| `readonly` | `boolean` | `false` | Hides add/edit/delete actions. |

| Event | Detail |
|---|---|
| `add` | `{}` — user clicked the add button. |
| `edit` | `{ index, item }` — user clicked edit on a row. |
| `delete` | `{ index, item }` — user clicked delete. |

**Table mode:** Generates `<th>` columns from `schema.children` leaf nodes.
Key columns get an accent-coloured key icon. Boolean columns render inline
`BooleanToggle` components (mini variant, no label).

**Cards mode:** Each item is a `ListItem` with the key value(s) as the
title and remaining leaves as a description line.

**Composite keys:** For lists with multiple keys (like `backbone-link`),
the table shows all key columns, and the card title concatenates them with
` : ` separators.

---

#### `ListItem`

A single row in card-style list management.

```svelte
<ListItem
  keyValue="pe-ams-01 : ethernet-1/1 ↔ p-core-01 : ethernet-1/1"
  description="key: left-router left-interface right-router right-interface"
  draggable={true}
  on:edit
  on:delete
/>
```

**Visual:** Horizontal card with drag handle (`⋮⋮`), content area, optional
status badge, and hover-revealed edit/delete buttons.

---

#### `WizardStepper`

Multi-step form navigation for complex service models (L3VPN).

```svelte
<WizardStepper
  steps={[
    { id: 1, label: 'VPN Profiles' },
    { id: 2, label: 'VPN Service' },
    { id: 3, label: 'Sites' },
    { id: 4, label: 'IP Connection' },
    { id: 5, label: 'Routing' },
  ]}
  bind:currentStep
  completedSteps={[1]}
/>
```

| Prop | Type |
|---|---|
| `steps` | `{ id: number, label: string }[]` |
| `currentStep` | `number` |
| `completedSteps` | `number[]` |

**Visual:** Horizontal row of numbered circles connected by lines. Completed
steps show a check mark with accent fill. The active step has a focus ring.
Clicking any completed or adjacent step navigates to it.

---

#### `YangPathBreadcrumb`

Displays the current YANG schema path in the header bar.

```svelte
<YangPathBreadcrumb
  segments={['netinfra', 'router', 'pe-ams-01']}
  on:navigate={handleBreadcrumbClick}
/>
```

Each segment is clickable. The last segment has the accent colour. Segments
are separated by ` / ` in monospace font.

---

#### `StatusBadge`

Consistent status indicator.

```svelte
<StatusBadge status="active" />   <!-- green dot + "Active" -->
<StatusBadge status="pending" />  <!-- amber dot + "Pending" -->
<StatusBadge status="error" />    <!-- red dot + "Error" -->
<StatusBadge status="draft" />    <!-- grey dot + "Draft" -->
```

---

#### `ValidationIcon`

Inline checkmark or error icon next to inputs.

```svelte
<ValidationIcon valid={true} />   <!-- green circle + ✓ -->
<ValidationIcon valid={false} />  <!-- red circle + ! -->
```

---

#### `Modal`

Generic overlay dialog.

```svelte
<Modal bind:open title="Add Router" badge="netinfra:router">
  <svelte:fragment slot="body">
    <!-- form content -->
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <button class="btn btn-secondary" on:click={() => open = false}>Cancel</button>
    <button class="btn btn-primary" on:click={save}>Save Router</button>
  </svelte:fragment>
</Modal>
```

| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | `false` |
| `title` | `string` | `''` |
| `badge` | `string\|null` | `null` |
| `width` | `string` | `'560px'` |

Closes on overlay click and Escape key. Traps focus within the dialog.

---

#### `JsonPreview`

Read-only syntax-highlighted JSON block.

```svelte
<JsonPreview data={routerPayload} />
```

Takes any JavaScript object, runs `JSON.stringify(data, null, 2)`, and applies
colour classes: keys in accent, strings in amber, numbers in purple, booleans
in pink. Rendered in a scrollable `<pre>` with dark background.

---

## 6. Leafref Resolution

Leafref fields need access to data from other parts of the model tree. The
resolution mechanism works as follows:

1. The page-level component builds a `resolvers` map:

```js
const resolvers = {
  '/netinfra:netinfra/router/name': routers.map(r => r.name),
  '/l3vpn-svc/vpn-services/vpn-service/vpn-id': vpns.map(v => v['vpn-id']),
};
```

2. `YangForm` stores this in Svelte context:

```js
import { setContext } from 'svelte';
setContext('yang-resolvers', resolvers);
```

3. `LeafrefSelect` retrieves the options:

```js
import { getContext } from 'svelte';
const resolvers = getContext('yang-resolvers');
$: options = resolvers[path] || [];
```

4. When the source list changes (e.g. a router is added), the page updates
   the `resolvers` prop on `YangForm`, which propagates reactively.

---

## 7. Validation

### 7.1 Built-in validators (in `types.js`)

```js
export const validators = {
  'inet:ipv4-address': (v) => { /* regex + per-octet check */ },
  'inet:ipv6-address': (v) => { /* regex or parser */ },
  'inet:ipv4-prefix':  (v) => { /* address + /0-32 */ },
  'inet:ipv6-prefix':  (v) => { /* address + /0-128 */ },
  'inet:as-number':    (v) => { /* 0..4294967295 */ },
  'yang:dotted-quad':  (v) => { /* regex: N.N.N.N, each 0-255 */ },
  'inet:port-number':  (v) => { /* 0..65535 */ },
  'inet:dscp':         (v) => { /* 0..63 */ },
};

export function validateNumericRange(value, min, max) { /* ... */ }
export function validateMandatory(value) { /* ... */ }
export function validatePattern(value, pattern) { /* ... */ }
```

### 7.2 Validation timing

- **On blur:** Run type-specific and mandatory validators. Show error inline.
- **On submit:** Run all validators. Scroll to first error. Prevent submission.
- **On input (debounced, 300ms):** Ip address inputs validate live to show the
  green check as the user types.

### 7.3 Error display

- Red border on the input (`border-color: var(--sw-danger)`).
- Red glow (`box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15)`).
- Error text below the input: `<div class="form-error">⚠ message</div>`.

---

## 8. Composing Pages from Components

### 8.1 Router list page (with layout)

```svelte
<script>
  import YangList from '$lib/components/list/YangList.svelte';
  import Modal from '$lib/components/overlay/Modal.svelte';
  import YangForm from '$lib/components/form/YangForm.svelte';
  import { fetchRouters, createRouter } from '../services/api.js';
  import routerSchema from '../schemas/netinfra-router.schema.json';
  import routerLayout from '../layouts/netinfra-router.layout.json';

  let routers = [];
  let modalOpen = false;
  let newRouter = {};

  function handleAdd() {
    newRouter = { mock: false, 'approval-required': false };
    modalOpen = true;
  }

  async function handleSave({ detail }) {
    await createRouter(detail.data);
    modalOpen = false;
    routers = await fetchRouters();
  }
</script>

<h1>Routers</h1>

<YangList
  schema={routerSchema}
  bind:items={routers}
  on:add={handleAdd}
/>

<Modal bind:open={modalOpen} title="Add Router" badge="netinfra:router">
  <svelte:fragment slot="body">
    <YangForm
      schema={routerSchema}
      layout={routerLayout}
      bind:data={newRouter}
      on:submit={handleSave}
    />
  </svelte:fragment>
</Modal>
```

### 8.2 L3VPN wizard page (layout-driven steps)

When the layout descriptor has `pageType: "wizard"`, `YangForm` renders a
`WizardStepper` automatically. The page component doesn't need to manage
steps manually.

```svelte
<script>
  import YangForm from '$lib/components/form/YangForm.svelte';
  import { fetchL3vpnService, createL3vpnService } from '../services/api.js';
  import l3vpnSchema from '../schemas/ietf-l3vpn-svc.schema.json';
  import l3vpnLayout from '../layouts/ietf-l3vpn-svc.layout.json';

  // l3vpnLayout.pageType === "wizard"
  // l3vpnLayout.wizard.steps defines the 5 steps

  let serviceData = {};
  let resolvers = {};

  // Populate leafref resolvers from live data
  async function loadResolvers() {
    const routers = await fetchCfsRouters();
    const vpns = await fetchCfsL3vpnServices();
    resolvers = {
      '/netinfra:netinfra/router/name': routers.map(r => r.name),
      '/l3vpn-svc/vpn-services/vpn-service/vpn-id': vpns.map(v => v['vpn-id']),
    };
  }
</script>

<h1>L3VPN Service Configuration</h1>

<!-- YangForm renders the wizard stepper, step panels, and
     navigation buttons based on the layout descriptor -->
<YangForm
  schema={l3vpnSchema}
  layout={l3vpnLayout}
  bind:data={serviceData}
  {resolvers}
  on:submit={({ detail }) => createL3vpnService(detail.data)}
/>
```

### 8.3 Opening the layout editor

Any page with a `YangForm` can offer a "Customize Layout" button that opens
the editor:

```svelte
<script>
  import LayoutEditor from '$lib/components/editor/LayoutEditor.svelte';
  import { saveUserLayout } from '../services/api.js';

  let editingLayout = false;
  let layout = routerLayout; // starts from base

  async function handleSaveLayout({ detail }) {
    await saveUserLayout(routerSchema.path, detail.layout);
    layout = detail.layout;
    editingLayout = false;
  }
</script>

<button on:click={() => editingLayout = true}>Customize Layout</button>

{#if editingLayout}
  <LayoutEditor
    schema={routerSchema}
    bind:layout
    on:save={handleSaveLayout}
    on:reset={() => { layout = routerLayout; editingLayout = false; }}
  />
{/if}
```

---

## 9. API Integration

Extend the existing `webui/src/services/api.js` with CFS-level endpoints.

```js
// ── CFS: Network Infrastructure ──

export async function fetchCfsRouters() {
  return fetchJSON(`${API_BASE}/cfs/netinfra/router`);
}

export async function createCfsRouter(data) {
  return fetchJSON(`${API_BASE}/cfs/netinfra/router`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCfsRouter(name, data) {
  return fetchJSON(`${API_BASE}/cfs/netinfra/router/${name}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCfsRouter(name) {
  return fetchJSON(`${API_BASE}/cfs/netinfra/router/${name}`, {
    method: 'DELETE',
  });
}

// ── CFS: Backbone Links ──

export async function fetchCfsBBLinks() {
  return fetchJSON(`${API_BASE}/cfs/netinfra/backbone-link`);
}

export async function createCfsBBLink(data) {
  return fetchJSON(`${API_BASE}/cfs/netinfra/backbone-link`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── CFS: L3VPN Services ──

export async function fetchCfsL3vpnServices() {
  return fetchJSON(`${API_BASE}/cfs/ietf-l3vpn-svc/l3vpn-svc/vpn-services/vpn-service`);
}

export async function createCfsL3vpnService(data) {
  return fetchJSON(`${API_BASE}/cfs/ietf-l3vpn-svc/l3vpn-svc/vpn-services/vpn-service`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── YANG Schema ──

export async function fetchYangSchema(module) {
  // Returns the YangNode descriptor for a module
  return fetchJSON(`${API_BASE}/yang/schema/${module}`);
}

// ── Layouts ──

export async function fetchLayout(schemaPath) {
  // Returns the base LayoutDescriptor (from committed JSON file)
  return fetchJSON(`${API_BASE}/layout/${encodeURIComponent(schemaPath)}`);
}

export async function fetchEffectiveLayout(schemaPath) {
  // Returns base layout + user overlay merged
  return fetchJSON(`${API_BASE}/layout/${encodeURIComponent(schemaPath)}?effective=true`);
}

export async function saveUserLayoutOverlay(schemaPath, overlay) {
  // Stores the user's customization overlay (diffs only)
  return fetchJSON(`${API_BASE}/layout/${encodeURIComponent(schemaPath)}/overlay`, {
    method: 'PUT',
    body: JSON.stringify(overlay),
  });
}

export async function deleteUserLayoutOverlay(schemaPath) {
  // Resets to the base layout by deleting the user overlay
  return fetchJSON(`${API_BASE}/layout/${encodeURIComponent(schemaPath)}/overlay`, {
    method: 'DELETE',
  });
}

export async function generateLayout(schemaPath, options = {}) {
  // Triggers the LLM layout skill and returns a new LayoutDescriptor
  return fetchJSON(`${API_BASE}/layout/${encodeURIComponent(schemaPath)}/generate`, {
    method: 'POST',
    body: JSON.stringify({
      pageType: options.pageType || 'auto',
      instructions: options.instructions || null,
    }),
  });
}
```

---

## 10. Routing

Extend the svelte-routing setup in `App.svelte`:

```svelte
<Route path="/">              <Dashboard />        </Route>
<Route path="routers">        <RouterList />       </Route>
<Route path="routers/:name">  <RouterDetail />     </Route>
<Route path="bb-links">       <BBLinkList />       </Route>
<Route path="l3vpn">          <L3vpnWizard />      </Route>
<Route path="l3vpn/:vpnId">   <L3vpnDetail />      </Route>
<Route path="components">     <ComponentShowcase /> </Route>

<!-- Existing routes -->
<Route path="devices">        <DeviceList />       </Route>
<Route path="device/:id" let:params>
  <DeviceDetail deviceId={params.id} />
</Route>
```

The sidebar (new `Sidebar.svelte`) replaces the current top nav and provides
section-grouped navigation with active-state highlighting and badge counts.

---

## 11. Implementation Priorities

| Phase | Components | Deliverable |
|---|---|---|
| **1 — Tokens & primitives** | `theme.css`, `StringInput`, `NumberInput`, `BooleanToggle`, `ValidationIcon`, `StatusBadge` | Design tokens applied globally, basic form fields work |
| **2 — IP & network types** | `IpAddressInput`, `IpPrefixInput`, `AsNumberInput`, `Decimal64Input`, `types.js` validators | All inet-types inputs with inline validation |
| **3 — Selection widgets** | `EnumSelect`, `IdentityTabs`, `IdentitySelector`, `LeafrefSelect` | All YANG selection types render correctly |
| **4 — Auto layout & composition** | `Collapsible`, `ChoiceCaseTabs`, `FormRow`, `SectionDivider`, `YangField`, `YangForm` (schema-only, `layout=null` fallback) | Recursive form rendering from schema alone — no layout descriptor needed yet |
| **5 — Layout descriptor support** | `LayoutGroup`, `TabGroup`, `layout-merge.js`, `YangForm` layout prop | Forms render from schema + layout descriptor pairs |
| **6 — LLM layout generator** | Layout generation API endpoint, LLM skill prompt, `generateLayout()` | One-command layout generation from any YANG module |
| **7 — Lists & navigation** | `YangList`, `ListItem`, `AddItemButton`, `Modal`, `Sidebar`, `YangPathBreadcrumb` | Full CRUD for list nodes, sidebar nav |
| **8 — Wizard** | `WizardStepper`, wizard rendering in `YangForm` | Multi-step service provisioning driven by layout |
| **9 — Layout editor** | `LayoutEditor`, `FieldPalette`, `FieldToolbar`, `GroupToolbar`, `DragDropZone`, `LayoutDiffPreview` | Visual drag-and-drop layout customization |
| **10 — API + integration** | CFS API endpoints, layout persistence endpoints, user overlay merge, end-to-end page components | Full working flows with customizable layouts |

---

## 12. Accessibility

- All interactive elements must be keyboard-reachable (tab order).
- `BooleanToggle`: use `role="switch"` and `aria-checked`.
- `ChoiceCaseTabs`: use `role="tablist"`, `role="tab"`, `aria-selected`.
- `Modal`: trap focus, close on Escape, `role="dialog"`, `aria-modal="true"`.
- `Collapsible`: use `aria-expanded` on the header button.
- Form inputs must have associated `<label>` elements (using `for`/`id`).
- Error messages must be linked to inputs via `aria-describedby`.
- Colour is never the sole indicator of state (always paired with text or icon).
