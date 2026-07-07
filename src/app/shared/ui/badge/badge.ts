import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hn-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [style.background]="bg()" [style.color]="ink()">{{ label() }}</span>`,
  styles: [
    `
      span {
        display: inline-block;
        font-size: 11.5px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: var(--hn-radius-pill);
        white-space: nowrap;
      }
    `,
  ],
})
export class Badge {
  readonly label = input('');
  readonly bg = input('#FBEFD4');
  readonly ink = input('#8A5E12');
}
