import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="hn-page">
      <div class="hn-frame">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .hn-page {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(120% 120% at 50% 0%, var(--hn-app-bg-from) 0%, var(--hn-app-bg-to) 100%);
      }
      .hn-frame {
        position: relative;
        width: 100%;
        max-width: none;
        height: 100dvh;
        max-height: none;
        background: var(--hn-surface);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: var(--hn-shadow-frame);
      }
      @media (min-width: 1024px) {
        .hn-page {
          align-items: stretch;
        }
      }
    `,
  ],
})
export class App {}
