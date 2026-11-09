import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { StoryGroup, isHttpUrl } from '../../../core/models/story.model';
import { initials } from '../../../core/util/format';
import { ProgressBar } from '../progress-bar/progress-bar';

/** Lo que dura una imagen en pantalla; un video dura lo que dura el video. */
const IMAGE_MS = 5000;
const TICK_MS = 100;

/**
 * Visor de historias a pantalla completa (QK-111). Recorre las historias de
 * cada grupo y sigue con el grupo siguiente, como cualquier visor de
 * historias. En desktop se presenta como un marco 9:16 centrado, la forma
 * desktop de este overlay (misma regla que `hn-bottom-sheet`).
 *
 * Emite `viewed` por cada historia que muestra: registrar la vista (y solo
 * con sesión) es decisión de la página, no del visor.
 */
@Component({
  selector: 'hn-story-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="backdrop" (click)="close()">
      <div
        #dialog
        class="frame"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="label()"
        (click)="$event.stopPropagation()"
      >
        <!-- Un elemento por historia: así cada imagen dispara su propio load y
             cada video arranca de cero con autoplay. -->
        @for (s of current(); track s.id) {
          @if (s.mediaType === 'video') {
            <video
              #video
              class="media"
              [muted]="muted()"
              [src]="s.mediaUrl"
              autoplay
              playsinline
              preload="auto"
              [attr.aria-label]="alt()"
              (timeupdate)="onTime(video)"
              (ended)="next()"
              (error)="next()"
            ></video>
          } @else {
            <img
              class="media"
              [src]="s.mediaUrl"
              [alt]="alt()"
              (load)="startImageTimer()"
              (error)="startImageTimer()"
            />
          }
        }

        <button
          class="zone prev"
          type="button"
          aria-label="Historia anterior"
          (click)="prev()"
        ></button>
        <button
          class="zone next"
          type="button"
          aria-label="Historia siguiente"
          (click)="next()"
        ></button>

        <div class="top">
          <div class="bars" aria-hidden="true">
            @for (b of bars(); track b.id) {
              <hn-progress-bar class="bar" [pct]="b.pct" [height]="3" />
            }
          </div>
          <div class="head">
            <span class="avatar" aria-hidden="true">
              @if (group()?.organizationLogoUrl; as logo) {
                <img [src]="logo" alt="" />
              } @else {
                {{ orgInitials() }}
              }
            </span>
            <span class="org">{{ group()?.organizationName }}</span>
            @if (isVideo()) {
              <button
                class="icon"
                type="button"
                [attr.aria-label]="muted() ? 'Activar sonido' : 'Silenciar'"
                [attr.aria-pressed]="!muted()"
                (click)="muted.set(!muted())"
              >
                {{ muted() ? '🔇' : '🔊' }}
              </button>
            }
            <button
              #closeBtn
              class="icon"
              type="button"
              aria-label="Cerrar historias"
              (click)="close()"
            >
              ✕
            </button>
          </div>
        </div>

        @if (text() || link()) {
          <div class="bottom">
            @if (text()) {
              <p class="text">{{ text() }}</p>
            }
            @if (link(); as href) {
              <a
                class="hn-btn hn-btn--white more"
                [href]="href"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver más
              </a>
            }
          </div>
        }

        <p class="sr-only" aria-live="polite">{{ position() }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: var(--hn-story-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: hn-fade 0.15s ease;
      }
      .frame {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--hn-story-bg);
        color: var(--hn-story-ink);
      }
      .media {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        /* 9:16 recomendado, no exigido (§18): lo demás se recorta al marco. */
        object-fit: cover;
        display: block;
      }
      .zone {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 1;
        border: 0;
        padding: 0;
        background: none;
        cursor: pointer;
      }
      .zone.prev {
        left: 0;
        width: 33%;
      }
      .zone.next {
        right: 0;
        width: 67%;
      }
      .zone:focus-visible {
        outline: 2px solid var(--hn-story-ink);
        outline-offset: -4px;
      }
      .top {
        position: absolute;
        inset: 0 0 auto;
        z-index: 2;
        padding: calc(10px + env(safe-area-inset-top)) 12px 26px;
        background: linear-gradient(var(--hn-story-scrim), transparent);
        pointer-events: none;
      }
      .bars {
        display: flex;
        gap: 4px;
      }
      .bar {
        flex: 1;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
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
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .icon {
        pointer-events: auto;
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-story-scrim);
        color: var(--hn-story-ink);
        font-size: 17px;
        cursor: pointer;
      }
      .icon:focus-visible,
      .more:focus-visible {
        outline: 2px solid var(--hn-story-ink);
        outline-offset: 2px;
      }
      .bottom {
        position: absolute;
        inset: auto 0 0;
        z-index: 2;
        padding: 40px 18px calc(22px + env(safe-area-inset-bottom));
        background: linear-gradient(transparent, var(--hn-story-scrim) 45%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        /* El texto no tapa las zonas de avance; el enlace sí recibe el toque. */
        pointer-events: none;
      }
      .text {
        margin: 0;
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.4;
        white-space: pre-line;
        overflow-wrap: anywhere;
        text-shadow: 0 1px 3px var(--hn-story-scrim);
      }
      .more {
        pointer-events: auto;
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
          width: auto;
          height: min(92vh, 860px);
          aspect-ratio: 9 / 16;
          border-radius: var(--hn-radius-xl);
          box-shadow: var(--hn-shadow-frame);
        }
      }
    `,
  ],
})
export class StoryViewer implements OnInit {
  readonly groups = input.required<StoryGroup[]>();
  /** Índice del grupo por el que se abre. */
  readonly start = input(0);
  readonly viewed = output<string>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly closeBtn = viewChild.required<ElementRef<HTMLButtonElement>>('closeBtn');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  private readonly groupIndex = signal(0);
  private readonly storyIndex = signal(0);
  private readonly progress = signal(0);
  readonly muted = signal(true);

  readonly group = computed<StoryGroup | undefined>(() => this.groups()[this.groupIndex()]);
  readonly story = computed(() => this.group()?.stories[this.storyIndex()]);
  readonly current = computed(() => {
    const story = this.story();
    return story ? [story] : [];
  });
  readonly isVideo = computed(() => this.story()?.mediaType === 'video');
  readonly text = computed(() => this.story()?.text?.trim() ?? '');
  readonly link = computed(() => {
    const url = this.story()?.linkUrl;
    return isHttpUrl(url) ? url.trim() : null;
  });
  readonly bars = computed(() => {
    const at = this.storyIndex();
    return (this.group()?.stories ?? []).map((s, i) => ({
      id: s.id,
      pct: i < at ? 100 : i === at ? this.progress() : 0,
    }));
  });
  readonly label = computed(() => `Historias de ${this.group()?.organizationName ?? ''}`);
  readonly alt = computed(
    () => this.text() || `Historia de ${this.group()?.organizationName ?? ''}`,
  );
  readonly orgInitials = computed(() => initials(this.group()?.organizationName ?? ''));
  readonly position = computed(
    () => `Historia ${this.storyIndex() + 1} de ${this.group()?.stories.length ?? 0}`,
  );

  private timer: ReturnType<typeof setInterval> | undefined;
  /** Al cerrar, el foco vuelve a donde estaba (normalmente el círculo tocado). */
  private readonly opener = document.activeElement as HTMLElement | null;

  constructor() {
    afterNextRender(() => this.closeBtn().nativeElement.focus());
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.timer);
      this.opener?.focus?.();
    });
  }

  ngOnInit(): void {
    const start = this.start();
    this.groupIndex.set(start >= 0 && start < this.groups().length ? start : 0);
    this.show();
  }

  next(): void {
    const stories = this.group()?.stories ?? [];
    if (this.storyIndex() < stories.length - 1) {
      this.storyIndex.update((i) => i + 1);
    } else if (this.groupIndex() < this.groups().length - 1) {
      this.groupIndex.update((i) => i + 1);
      this.storyIndex.set(0);
    } else {
      this.close();
      return;
    }
    this.show();
  }

  prev(): void {
    if (this.storyIndex() > 0) {
      this.storyIndex.update((i) => i - 1);
    } else if (this.groupIndex() > 0) {
      const gi = this.groupIndex() - 1;
      this.groupIndex.set(gi);
      this.storyIndex.set(this.groups()[gi].stories.length - 1);
    } else {
      // Ya es la primera: se reinicia. El elemento no cambia, así que no hay
      // un load nuevo que arranque el reloj.
      this.show();
      const video = this.video()?.nativeElement;
      if (video) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else {
        this.startImageTimer();
      }
      return;
    }
    this.show();
  }

  close(): void {
    clearInterval(this.timer);
    this.closed.emit();
  }

  /** Imagen: el reloj arranca cuando ya cargó (o falló), no mientras baja. */
  startImageTimer(): void {
    clearInterval(this.timer);
    const startedAt = Date.now();
    this.timer = setInterval(() => {
      const pct = ((Date.now() - startedAt) / IMAGE_MS) * 100;
      if (pct >= 100) this.next();
      else this.progress.set(pct);
    }, TICK_MS);
  }

  onTime(video: HTMLVideoElement): void {
    if (video.duration) this.progress.set((video.currentTime / video.duration) * 100);
  }

  onKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.prev();
        break;
      case 'Tab':
        this.trapFocus(event);
        break;
    }
  }

  private show(): void {
    clearInterval(this.timer);
    this.progress.set(0);
    const story = this.story();
    if (story) this.viewed.emit(story.id);
  }

  /** Foco atrapado: Tab y Shift+Tab ciclan dentro del visor mientras está abierto. */
  private trapFocus(event: KeyboardEvent): void {
    const root = this.dialog().nativeElement;
    const focusables = Array.from(root.querySelectorAll<HTMLElement>('button, a[href]'));
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
