import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hn-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="track" [style.height.px]="height()">
      <div class="fill" [style.width]="pct() + '%'" [style.background]="color()"></div>
    </div>
  `,
  styles: [
    `
      .track {
        background: var(--hn-border-line);
        border-radius: var(--hn-radius-pill);
        overflow: hidden;
      }
      .fill {
        height: 100%;
        border-radius: var(--hn-radius-pill);
        transition: width 0.4s ease;
      }
    `,
  ],
})
export class ProgressBar {
  readonly pct = input(0);
  readonly color = input('var(--hn-primary)');
  readonly height = input(10);
}
