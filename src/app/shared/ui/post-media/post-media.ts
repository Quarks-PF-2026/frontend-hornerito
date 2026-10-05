import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PostMedia } from '../../../core/models/media.model';

/**
 * Grilla de adjuntos de una publicación: uno solo ocupa todo el ancho, de dos
 * en adelante van en dos columnas. Los videos usan los controles nativos y
 * solo bajan metadata hasta que se reproducen.
 */
@Component({
  selector: 'hn-post-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (media().length > 0) {
      <div class="grid" [class.single]="media().length === 1">
        @for (m of media(); track m.id) {
          @if (m.resourceType === 'video') {
            <video
              [src]="m.url"
              controls
              preload="metadata"
              playsinline
              [attr.width]="m.width"
              [attr.height]="m.height"
              [attr.aria-label]="alt()"
            ></video>
          } @else {
            <img
              [src]="m.url"
              [alt]="alt()"
              loading="lazy"
              [attr.width]="m.width"
              [attr.height]="m.height"
            />
          }
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-top: 10px;
      }
      .grid.single {
        grid-template-columns: 1fr;
      }
      img,
      video {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        display: block;
        border-radius: var(--hn-radius-md);
        background: var(--hn-input-bg);
      }
      .single img,
      .single video {
        /* Con width/height como atributos, auto reserva la proporción real
           antes de que cargue el archivo y no salta el layout. */
        aspect-ratio: auto;
        height: auto;
        max-height: 420px;
        object-fit: contain;
      }
    `,
  ],
})
export class PostMediaGrid {
  readonly media = input<PostMedia[]>([]);
  /** Texto alternativo; normalmente el título de la publicación. */
  readonly alt = input('');
}
