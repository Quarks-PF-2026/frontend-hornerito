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
    `,
  ],
})
export class BottomSheet {
  readonly closed = output<void>();
}
