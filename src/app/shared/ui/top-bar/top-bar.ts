import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hn-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <div class="logo">
        <img src="assets/hornerito-bird.png" alt="" />
      </div>
      <div class="titles">
        <div class="kicker">{{ kicker() }}</div>
        <div class="title hn-head">{{ title() }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .bar {
        padding: 16px 20px 14px;
        background: var(--hn-surface);
        border-bottom: 1px solid var(--hn-border-soft);
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .logo {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--hn-card);
        border: 1px solid var(--hn-border-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .logo img {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }
      .titles {
        flex: 1;
        min-width: 0;
      }
      .kicker {
        font-size: 12px;
        color: var(--hn-muted);
        font-weight: 600;
        line-height: 1;
      }
      .title {
        font-size: 19px;
        line-height: 1.15;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class TopBar {
  readonly kicker = input('');
  readonly title = input('');
}
