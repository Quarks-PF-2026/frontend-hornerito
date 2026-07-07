import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'hn-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.message(); as msg) {
      <div class="toast">{{ msg }}</div>
    }
  `,
  styles: [
    `
      .toast {
        position: absolute;
        left: 50%;
        bottom: 120px;
        transform: translateX(-50%);
        z-index: 60;
        background: var(--hn-ink);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        padding: 12px 20px;
        border-radius: var(--hn-radius-md);
        box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        animation: hn-fade 0.15s ease;
      }
    `,
  ],
})
export class Toast {
  readonly toast = inject(ToastService);
}
