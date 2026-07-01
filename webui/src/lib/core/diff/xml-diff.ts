export type XmlDiffRunKind = 'add' | 'remove';

export interface XmlDiffRun {
  text: string;
  kind: XmlDiffRunKind;
}

// NETCONF base:1.0 edit operation marking a deletion (any namespace prefix),
// e.g. xc:operation="remove" or nc:operation="delete". Single or double quotes.
const REMOVE_OPERATION = /\boperation\s*=\s*["'](?:remove|delete)["']/i;

// Comments / CDATA / processing instructions are matched whole (so a `>` inside
// them doesn't fool the tag scanner); everything else is an element tag.
const TAG_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[^>]+>/g;

/**
 * Split a NETCONF-style XML config diff into colored runs. Any element carrying
 * a NETCONF operation="remove"|"delete" attribute is marked `remove` (red) for
 * its whole subtree — open tag through matching close tag; everything else is
 * `add` (green), since the rest of the payload is config being merged/added.
 *
 * The concatenation of all run texts equals the input exactly (indentation,
 * attributes and namespaces are preserved); the only adjustment is that the
 * leading indentation of a removed element is moved into its run so the
 * highlight starts at the element's column.
 */
export function highlightXmlDiff(xml: string): XmlDiffRun[] {
  const runs: XmlDiffRun[] = [];
  let buf = '';
  let kind: XmlDiffRunKind = 'add';
  let depth = 0;
  let removeParentDepth: number | null = null; // nesting depth just outside the active removed subtree

  const setKind = (next: XmlDiffRunKind): void => {
    if (next === kind) return;
    if (buf) {
      runs.push({ text: buf, kind });
      buf = '';
    }
    kind = next;
  };

  const beginRemove = (): void => {
    // Peel the element's leading indentation off the current 'add' buffer so the
    // red run starts at the element's column rather than mid-line.
    const ws = /[ \t]+$/.exec(buf);
    const lead = ws ? ws[0] : '';
    if (lead) buf = buf.slice(0, buf.length - lead.length);
    setKind('remove');
    buf = lead;
  };

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(xml)) !== null) {
    if (match.index > lastIndex) buf += xml.slice(lastIndex, match.index); // text node
    lastIndex = TAG_RE.lastIndex;
    const tag = match[0];

    if (tag.startsWith('<!') || tag.startsWith('<?')) {
      buf += tag; // comment / CDATA / PI — irrelevant to nesting depth
      continue;
    }

    const isClose = tag.startsWith('</');
    const isSelfClosing = !isClose && tag.endsWith('/>');

    if (isClose) {
      buf += tag;
      depth -= 1;
      if (removeParentDepth !== null && depth <= removeParentDepth) {
        removeParentDepth = null;
        setKind('add');
      }
    } else if (isSelfClosing) {
      if (removeParentDepth === null && REMOVE_OPERATION.test(tag)) {
        beginRemove();
        buf += tag;
        setKind('add'); // self-closing remove: only this one tag is red
      } else {
        buf += tag;
      }
    } else {
      if (removeParentDepth === null && REMOVE_OPERATION.test(tag)) {
        beginRemove();
        removeParentDepth = depth;
      }
      buf += tag;
      depth += 1;
    }
  }

  if (lastIndex < xml.length) buf += xml.slice(lastIndex);
  if (buf) runs.push({ text: buf, kind });
  return runs;
}
