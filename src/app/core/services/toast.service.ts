import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _message = signal('');
  readonly message = this._message.asReadonly();
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(msg: string): void {
    this._message.set(msg);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._message.set(''), 2200);
  }
}
