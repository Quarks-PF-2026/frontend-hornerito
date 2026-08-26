import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ALLOWED_IMAGE_TYPES, Media, MediaOwnerType } from '../../../core/models/media.model';
import { MediaService } from '../../../core/services/media.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Slot de imagen: ocupa todo el contenedor que lo envuelve, así el que lo usa
 * decide la forma (avatar redondeado, portada ancha, etc.).
 *
 * Sube apenas se elige el archivo; no depende del guardado de ningún
 * formulario. La validación de acá es solo para dar respuesta rápida: la que
 * manda es la del backend.
 */
@Component({
  selector: 'hn-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="slot">
      @if (preview() ?? url()) {
        <img class="img" [src]="preview() ?? url()" [alt]="alt()" />
      } @else {
        <span class="fallback">{{ fallback() }}</span>
      }

      @if (editable()) {
        <label class="pick" [class.busy]="busy()">
          <input
            type="file"
            [accept]="accept"
            [disabled]="busy()"
            (change)="onPick($event)"
          />
          <span class="pick-ico">{{ busy() ? '⏳' : '📷' }}</span>
          <span class="sr">{{ alt() }}</span>
        </label>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .slot {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .pick {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        cursor: pointer;
        padding: 4px;
      }
      .pick.busy {
        cursor: progress;
      }
      .pick input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .pick-ico {
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 12px;
        line-height: 1;
        padding: 5px;
        border-radius: var(--hn-radius-pill);
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class ImageUpload {
  private readonly media = inject(MediaService);
  private readonly toast = inject(ToastService);

  readonly ownerType = input.required<MediaOwnerType>();
  readonly ownerId = input.required<string>();
  readonly purpose = input.required<string>();
  readonly url = input<string | null>(null);
  readonly alt = input('Imagen');
  /** Se muestra cuando todavía no hay imagen cargada. */
  readonly fallback = input('🖼️');
  readonly editable = input(false);
  readonly maxBytes = input(5_000_000);

  readonly uploaded = output<Media>();

  readonly busy = signal(false);
  readonly preview = signal<string | null>(null);

  readonly accept = ALLOWED_IMAGE_TYPES.join(',');

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.toast.show('La imagen tiene que ser JPG, PNG o WEBP');
      return;
    }
    if (file.size > this.maxBytes()) {
      this.toast.show(`La imagen supera los ${Math.round(this.maxBytes() / 1_000_000)} MB`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    this.preview.set(localUrl);
    this.busy.set(true);

    this.media
      .upload(this.ownerType(), this.ownerId(), this.purpose(), file)
      .subscribe({
        next: (media) => {
          this.busy.set(false);
          // Primero avisamos (el padre actualiza `url`) y recién ahí soltamos el
          // preview local, para que no parpadee el hueco vacío en el medio.
          this.uploaded.emit(media);
          this.release(localUrl);
          this.toast.show('Imagen actualizada');
        },
        error: (err: HttpErrorResponse) => {
          this.release(localUrl);
          this.busy.set(false);
          this.toast.show(
            (err.error as { message?: string } | null)?.message ??
              'No se pudo subir la imagen',
          );
        },
      });
  }

  private release(localUrl: string): void {
    this.preview.set(null);
    URL.revokeObjectURL(localUrl);
  }
}
