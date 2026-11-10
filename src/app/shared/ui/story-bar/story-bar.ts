import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StoryGroup } from '../../../core/models/story.model';
import { initials } from '../../../core/util/format';

/**
 * Fila horizontal de organizaciones con historias (QK-111). Solo dibuja y
 * avisa qué grupo se tocó: abrir el visor y marcar vistas es de la página.
 * Un grupo con todas sus historias vistas lleva el aro apagado (§18).
 */
@Component({
  selector: 'hn-story-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bar hn-scroll" aria-label="Historias">
      @for (item of items(); track item.id; let i = $index) {
        <li>
          <button
            type="button"
            class="story"
            [attr.aria-label]="'Ver historias de ' + item.name + (item.seen ? ' (ya vistas)' : '')"
            (click)="opened.emit(i)"
          >
            <span class="ring" [class.seen]="item.seen">
              <span class="avatar">
                @if (item.logoUrl) {
                  <img [src]="item.logoUrl" alt="" />
                } @else {
                  <span aria-hidden="true">{{ item.initials }}</span>
                }
              </span>
            </span>
            <span class="name">{{ item.name }}</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .bar {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        list-style: none;
        margin: 0;
        padding: 4px 2px 14px;
      }
      .story {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 74px;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        font: inherit;
      }
      .ring {
        padding: 3px;
        border-radius: var(--hn-radius-pill);
        background: linear-gradient(135deg, var(--hn-canela-200), var(--hn-primary-strong));
      }
      /* Ya vistas: aro neutro, como cualquier barra de historias. */
      .ring.seen {
        background: var(--hn-border);
      }
      .avatar {
        width: 62px;
        height: 62px;
        border-radius: var(--hn-radius-pill);
        border: 3px solid var(--hn-surface);
        background: var(--hn-cream-soft);
        display: grid;
        place-items: center;
        overflow: hidden;
        font-family: var(--hn-font-head);
        font-weight: 700;
        color: var(--hn-primary-strong);
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .name {
        max-width: 100%;
        font-size: 12px;
        font-weight: 600;
        color: var(--hn-ink-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .story:focus-visible {
        outline: 2px solid var(--hn-primary);
        outline-offset: 2px;
        border-radius: var(--hn-radius-sm);
      }
    `,
  ],
})
export class StoryBar {
  readonly groups = input<StoryGroup[]>([]);
  /** Índice del grupo tocado dentro de `groups`. */
  readonly opened = output<number>();

  readonly items = computed(() =>
    this.groups().map((g) => ({
      id: g.organizationId,
      name: g.organizationName,
      logoUrl: g.organizationLogoUrl,
      initials: initials(g.organizationName),
      seen: g.stories.every((s) => s.seen),
    })),
  );
}
