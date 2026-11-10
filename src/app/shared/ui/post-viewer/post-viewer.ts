import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PublicPost } from '../../../core/models/public.model';
import { initials } from '../../../core/util/format';

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Publicación abierta desde la grilla del perfil público, estilo Instagram:
 * en mobile ocupa la pantalla (media arriba, texto abajo); en desktop es un
 * modal centrado con la media a la izquierda y el texto a la derecha, la forma
 * desktop de este overlay (misma regla que `hn-bottom-sheet`).
 *
 * Las fotos de una publicación se recorren con `scroll-snap` nativo: el swipe
 * en táctil sale gratis y no hace falta una librería de carrusel. ←/→ pasan de
 * publicación; Esc cierra.
 */
@Component({
  selector: 'hn-post-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <!-- El diálogo es todo el overlay: las flechas de publicación viven fuera
         del marco y con aria-modal en el marco quedarían inertes para el lector. -->
    <div
      #root
      class="backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="post()?.title"
      (click)="close()"
    >
      @if (hasPrev()) {
        <button
          class="nav prev"
          type="button"
          aria-label="Publicación anterior"
          (click)="go(-1); $event.stopPropagation()"
        >
          ‹
        </button>
      }

      <div class="frame" [class.text-only]="!media().length" (click)="$event.stopPropagation()">
        <header class="head">
          <span class="avatar" aria-hidden="true">
            @if (orgLogoUrl(); as logo) {
              <img [src]="logo" alt="" />
            } @else {
              {{ orgInitials() }}
            }
          </span>
          <span class="org">{{ orgName() }}</span>
          <button
            #closeBtn
            class="icon"
            type="button"
            aria-label="Cerrar publicación"
            (click)="close()"
          >
            ✕
          </button>
        </header>

        @if (media().length) {
          <div class="media">
            <div #track class="track" (scroll)="onScroll()">
              @for (m of media(); track m.id) {
                @if (m.resourceType === 'video') {
                  <video
                    class="slide"
                    [src]="m.url"
                    controls
                    playsinline
                    preload="metadata"
                    [attr.aria-label]="post()?.title"
                  ></video>
                } @else {
                  <img class="slide" [src]="m.url" [alt]="post()?.title" />
                }
              }
            </div>

            @if (media().length > 1) {
              @if (slide() > 0) {
                <button
                  class="step back"
                  type="button"
                  aria-label="Foto anterior"
                  (click)="scrollTo(slide() - 1)"
                >
                  ‹
                </button>
              }
              @if (slide() < media().length - 1) {
                <button
                  class="step fwd"
                  type="button"
                  aria-label="Foto siguiente"
                  (click)="scrollTo(slide() + 1)"
                >
                  ›
                </button>
              }
              <div class="dots" aria-hidden="true">
                @for (m of media(); track m.id; let i = $index) {
                  <span class="dot" [class.on]="i === slide()"></span>
                }
              </div>
            }
          </div>
        }

        <div class="body">
          <h2 class="hn-head title">{{ post()?.title }}</h2>
          @if (content(); as content) {
            <p class="content">{{ content }}</p>
          }
          <p class="date">{{ date() }}</p>
        </div>

        <p class="sr-only" aria-live="polite">{{ position() }}</p>
      </div>

      @if (hasNext()) {
        <button
          class="nav next"
          type="button"
          aria-label="Publicación siguiente"
          (click)="go(1); $event.stopPropagation()"
        >
          ›
        </button>
      }
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: var(--hn-story-scrim);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: hn-fade 0.15s ease;
      }
      .frame {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        background: var(--hn-card);
        display: flex;
        flex-direction: column;
      }
      .head {
        grid-area: head;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: calc(10px + env(safe-area-inset-top)) 12px 10px 16px;
        border-bottom: 1px solid var(--hn-border-line);
      }
      .avatar {
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-cream-soft);
        color: var(--hn-primary-strong);
        display: grid;
        place-items: center;
        overflow: hidden;
        font-family: var(--hn-font-head);
        font-weight: 700;
        font-size: 13px;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .org {
        flex: 1;
        min-width: 0;
        font-weight: 700;
        font-size: 14px;
        color: var(--hn-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .icon {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: var(--hn-radius-pill);
        background: none;
        color: var(--hn-ink);
        font-size: 18px;
        cursor: pointer;
      }
      .media {
        grid-area: media;
        position: relative;
        flex-shrink: 0;
        background: var(--hn-story-bg);
      }
      .track {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        aspect-ratio: 1;
      }
      .track::-webkit-scrollbar {
        display: none;
      }
      .slide {
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
        scroll-snap-align: center;
        display: block;
      }
      .step {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-story-scrim);
        color: var(--hn-story-ink);
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
      }
      .step.back {
        left: 8px;
      }
      .step.fwd {
        right: 8px;
      }
      .dots {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 10px;
        display: flex;
        justify-content: center;
        gap: 5px;
        pointer-events: none;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-story-ink);
        opacity: 0.45;
      }
      .dot.on {
        opacity: 1;
      }
      .body {
        grid-area: body;
        padding: 14px 16px calc(22px + env(safe-area-inset-bottom));
      }
      .title {
        font-size: 18px;
        margin: 0 0 8px;
        color: var(--hn-ink);
      }
      .content {
        margin: 0;
        font-size: 14.5px;
        line-height: 1.55;
        color: var(--hn-text);
        white-space: pre-line;
        overflow-wrap: anywhere;
      }
      .date {
        margin: 14px 0 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--hn-muted);
      }
      .nav {
        display: none;
      }
      .icon:focus-visible,
      .step:focus-visible,
      .nav:focus-visible {
        outline: 2px solid var(--hn-primary);
        outline-offset: 2px;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      @media (min-width: 768px) {
        .frame {
          width: min(960px, calc(100vw - 140px));
          height: auto;
          max-height: 90vh;
          overflow: hidden;
          border-radius: var(--hn-radius-xl);
          box-shadow: var(--hn-shadow-frame);
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
          grid-template-rows: auto 1fr;
          grid-template-areas:
            'media head'
            'media body';
        }
        /* Sin media, el texto ocupa todo el ancho. */
        .frame.text-only {
          width: min(560px, calc(100vw - 140px));
          grid-template-columns: 1fr;
          grid-template-areas:
            'head'
            'body';
        }
        .media {
          display: flex;
          align-items: center;
        }
        .track {
          width: 100%;
          max-height: 90vh;
        }
        .body {
          overflow-y: auto;
          padding-bottom: 22px;
        }
        .nav {
          display: grid;
          place-items: center;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border: 0;
          border-radius: var(--hn-radius-pill);
          background: var(--hn-card);
          color: var(--hn-ink);
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          box-shadow: var(--hn-shadow-card);
        }
        .nav.prev {
          left: 16px;
        }
        .nav.next {
          right: 16px;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .track {
          scroll-behavior: smooth;
        }
      }
    `,
  ],
})
export class PostViewer implements OnInit {
  readonly posts = input.required<PublicPost[]>();
  /** Índice de la publicación con la que se abre. */
  readonly start = input(0);
  readonly orgName = input('');
  readonly orgLogoUrl = input<string | null>(null);
  readonly closed = output<void>();

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly closeBtn = viewChild.required<ElementRef<HTMLButtonElement>>('closeBtn');
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  private readonly index = signal(0);
  /** Foto visible dentro de la publicación actual. */
  readonly slide = signal(0);

  readonly post = computed<PublicPost | undefined>(() => this.posts()[this.index()]);
  readonly media = computed(() => this.post()?.media ?? []);
  /** Muchas publicaciones repiten el título como texto: no se muestra dos veces. */
  readonly content = computed(() => {
    const p = this.post();
    const text = p?.content?.trim() ?? '';
    return text && text !== p?.title.trim() ? text : '';
  });
  readonly hasPrev = computed(() => this.index() > 0);
  readonly hasNext = computed(() => this.index() < this.posts().length - 1);
  readonly date = computed(() => {
    const at = this.post()?.createdAt;
    return at ? DATE_FORMAT.format(new Date(at)) : '';
  });
  readonly orgInitials = computed(() => initials(this.orgName()));
  readonly position = computed(
    () => `Publicación ${this.index() + 1} de ${this.posts().length}: ${this.post()?.title ?? ''}`,
  );

  private readonly injector = inject(Injector);

  /** Al cerrar, el foco vuelve a donde estaba (normalmente el cuadro tocado). */
  private readonly opener = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.closeBtn().nativeElement.focus());
    inject(DestroyRef).onDestroy(() => this.opener?.focus?.());
  }

  ngOnInit(): void {
    const start = this.start();
    this.index.set(start >= 0 && start < this.posts().length ? start : 0);
  }

  go(step: number): void {
    const next = this.index() + step;
    if (next < 0 || next >= this.posts().length) return;
    this.index.set(next);
    this.slide.set(0);
    // El carrusel puede reusarse entre publicaciones: sin esto quedaría corrido.
    const track = this.track()?.nativeElement;
    if (track) track.scrollLeft = 0;
    this.keepFocusInside();
  }

  scrollTo(i: number): void {
    const track = this.track()?.nativeElement;
    if (track) track.scrollTo({ left: i * track.clientWidth });
  }

  onScroll(): void {
    const track = this.track()?.nativeElement;
    if (!track?.clientWidth) return;
    const slide = Math.round(track.scrollLeft / track.clientWidth);
    if (slide === this.slide()) return;
    this.slide.set(slide);
    // El slide cambia recién cuando termina el scroll (suave), no al tocar la flecha.
    this.keepFocusInside();
  }

  close(): void {
    this.closed.emit();
  }

  onKey(event: KeyboardEvent): void {
    // Con el foco en un video, las flechas son del reproductor (adelantar/atrasar).
    const inMedia = event.target instanceof HTMLMediaElement;
    if (inMedia && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) return;
    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        this.go(1);
        break;
      case 'ArrowLeft':
        this.go(-1);
        break;
      case 'Tab':
        this.trapFocus(event);
        break;
    }
  }

  /**
   * Las flechas desaparecen en los extremos: si tenían el foco, caería al
   * `body`. Tras el render, se lo devuelve al botón de cerrar.
   */
  private keepFocusInside(): void {
    afterNextRender(
      () => {
        if (!this.root().nativeElement.contains(document.activeElement)) {
          this.closeBtn().nativeElement.focus();
        }
      },
      { injector: this.injector },
    );
  }

  /**
   * Foco atrapado: Tab y Shift+Tab ciclan dentro del overlay mientras está
   * abierto. Incluye las flechas de publicación, que viven fuera del marco.
   */
  private trapFocus(event: KeyboardEvent): void {
    const root = this.root().nativeElement;
    const focusables = Array.from(root.querySelectorAll<HTMLElement>('button, video[controls]'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (!root.contains(active) || (event.shiftKey && active === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
