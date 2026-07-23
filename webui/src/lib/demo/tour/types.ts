export interface TourStep {
  /** Logical app route the step lives on (pathname form, e.g. '/devices'). */
  route: string;
  /** data-tour attribute value to spotlight; omit for a centered step. */
  target?: string;
  title: string;
  body: string;
}
