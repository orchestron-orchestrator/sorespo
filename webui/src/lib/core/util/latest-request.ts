/**
 * Guards async loaders against out-of-order responses: begin() before the
 * fetch, then drop the result unless the token isCurrent() after the await.
 */
export class LatestRequest {
  #seq = 0;

  begin(): number {
    return ++this.#seq;
  }

  isCurrent(token: number): boolean {
    return token === this.#seq;
  }
}
