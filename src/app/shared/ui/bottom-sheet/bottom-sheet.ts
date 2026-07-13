import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'hn-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="sheet hn-scroll" (click)="$event.stopPropagation()">
        <div class="handle"></div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(46, 24, 10, 0.5);
        z-index: 40;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        animation: hn-fade 0.15s ease;
      }
      .sheet {
        background: var(--hn-surface);
        border-radius: 26px 26px 0 0;
        max-height: 92%;
        overflow-y: auto;
        padding: 8px 0 0;
        animation: hn-sheet 0.22s ease;
      }
      .handle {
        width: 42px;
        height: 5px;
        border-radius: var(--hn-radius-pill);
        background: #e0d4c0;
        margin: 8px auto 4px;
      }

      @media (min-width: 768px) {
        .backdrop {
          justify-content: center;
          align-items: center;
        }
        .sheet {
          width: 100%;
          max-width: 560px;
          max-height: 85vh;
          border-radius: var(--hn-radius-lg, 20px);
          padding-top: 0;
          animation: hn-modal 0.18s ease;
        }
        .handle {
          display: none;
        }
      }

      @keyframes hn-modal {
        from {
          opacity: 0;
          transform: scale(0.96) translateY(8px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
  ],
})
export class BottomSheet {
  readonly closed = output<void>();
}
