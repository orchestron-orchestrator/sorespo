export interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

/**
 * Reactive status banner state with auto-clearing success messages.
 * Errors stay until replaced; flash() clears itself unless another
 * message has been shown in the meantime.
 */
export class StatusFlash {
  message: StatusMessage | null = $state(null);
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(initial: StatusMessage | null = null) {
    this.message = initial;
  }

  set(message: StatusMessage | null): void {
    clearTimeout(this.#timer);
    this.message = message;
  }

  error(text: string): void {
    this.set({ type: 'error', text });
  }

  flash(text: string, ms = 3000): void {
    const message: StatusMessage = { type: 'success', text };
    this.set(message);
    this.#timer = setTimeout(() => {
      if (this.message === message) this.message = null;
    }, ms);
  }
}
