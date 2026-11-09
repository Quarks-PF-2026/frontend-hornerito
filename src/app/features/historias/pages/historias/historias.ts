import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MediaResourceType } from '../../../../core/models/media.model';
import {
  STORY_ACCEPT,
  STORY_IMAGE_MAX_BYTES,
  STORY_MAX_ACTIVE,
  STORY_TEXT_MAX,
  STORY_VIDEO_MAX_BYTES,
  STORY_VIDEO_MAX_SEC,
  isHttpUrl,
  storyKindOf,
} from '../../../../core/models/story.model';
import { ModalService } from '../../../../core/services/modal.service';
import { StoriesService } from '../../../../core/services/stories.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FilePicker } from '../../../../shared/ui/file-picker/file-picker';

/**
 * Historias de la organización (QK-111): alta, vigentes con su vencimiento y
 * vencidas como historial de solo lectura. Las validaciones de archivo son de
 * cortesía, para no gastar una subida: el backend revalida todo.
 */
@Component({
  selector: 'app-historias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilePicker],
  templateUrl: './historias.html',
  styleUrl: './historias.scss',
})
export class HistoriasPage {
  private readonly storiesSvc = inject(StoriesService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);

  readonly active = this.storiesSvc.activeViews;
  readonly expired = this.storiesSvc.expiredViews;
  readonly maxActive = STORY_MAX_ACTIVE;
  readonly textMax = STORY_TEXT_MAX;
  readonly accept = STORY_ACCEPT;

  readonly file = signal<File | null>(null);
  readonly kind = signal<MediaResourceType | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly fileError = signal('');
  /** Leyendo la duración del video elegido. */
  readonly checking = signal(false);
  readonly text = signal('');
  readonly link = signal('');
  readonly busy = signal(false);

  readonly full = computed(() => this.active().length >= STORY_MAX_ACTIVE);
  readonly textCount = computed(() => `${this.text().length}/${STORY_TEXT_MAX}`);
  readonly linkError = computed(() => {
    const link = this.link().trim();
    return link && !isHttpUrl(link)
      ? 'Ingresá un enlace válido que empiece con http:// o https:// (por ejemplo, https://comedor.org)'
      : '';
  });
  readonly canPublish = computed(
    () => !!this.file() && !this.linkError() && !this.busy() && !this.checking() && !this.full(),
  );

  /** Descarta el resultado de una elección vieja si se eligió otro archivo mientras se leía. */
  private pickSeq = 0;

  constructor() {
    this.storiesSvc.load().subscribe({
      error: () => this.toast.show('No pudimos cargar las historias'),
    });
    inject(DestroyRef).onDestroy(() => this.setPreview(null));
  }

  async pick(file: File | null): Promise<void> {
    const seq = ++this.pickSeq;
    this.checking.set(false);
    this.file.set(null);
    this.kind.set(null);
    this.setPreview(null);
    this.fileError.set('');
    if (!file) return;

    const kind = storyKindOf(file);
    if (!kind) {
      this.fileError.set(
        'Formato no admitido: subí una imagen JPEG, PNG o WebP, o un video MP4 o WebM.',
      );
      return;
    }
    if (file.size > (kind === 'video' ? STORY_VIDEO_MAX_BYTES : STORY_IMAGE_MAX_BYTES)) {
      this.fileError.set(
        kind === 'video' ? 'El video supera los 20 MB.' : 'La imagen supera los 8 MB.',
      );
      return;
    }

    const url = URL.createObjectURL(file);
    if (kind === 'video') {
      this.checking.set(true);
      const duration = await videoDuration(url);
      if (seq !== this.pickSeq) {
        URL.revokeObjectURL(url);
        return;
      }
      this.checking.set(false);
      if (duration > STORY_VIDEO_MAX_SEC) {
        URL.revokeObjectURL(url);
        this.fileError.set(`El video dura más de ${STORY_VIDEO_MAX_SEC} segundos.`);
        return;
      }
    }
    this.file.set(file);
    this.kind.set(kind);
    this.setPreview(url);
  }

  publish(): void {
    const file = this.file();
    const kind = this.kind();
    if (!file || !kind || !this.canPublish()) return;

    const text = this.text().trim();
    const linkUrl = this.link().trim();
    this.busy.set(true);
    this.storiesSvc
      .create(file, kind, { ...(text ? { text } : {}), ...(linkUrl ? { linkUrl } : {}) })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.reset();
          this.toast.show('Historia publicada');
        },
        error: (err: HttpErrorResponse) => {
          this.busy.set(false);
          this.toast.show(errorMessage(err));
        },
      });
  }

  remove(id: string): void {
    this.modal.confirmDeleteStory(id);
  }

  private reset(): void {
    this.pickSeq++;
    this.checking.set(false);
    this.file.set(null);
    this.kind.set(null);
    this.setPreview(null);
    this.text.set('');
    this.link.set('');
  }

  private setPreview(url: string | null): void {
    const previous = this.previewUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.previewUrl.set(url);
  }
}

/**
 * Duración del video según el navegador. Si no puede leer la metadata (un
 * códec que no reproduce) devuelve 0 y no bloquea: decide el backend.
 */
function videoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve(video.duration);
    video.onerror = () => resolve(0);
    video.src = url;
  });
}

/** Nuestro backend responde `{ message }` (a veces un array); Cloudinary, `{ error: { message } }`. */
function errorMessage(err: HttpErrorResponse): string {
  const body = err.error;
  const message = body?.message ?? body?.error?.message;
  return (Array.isArray(message) ? message[0] : message) || 'No se pudo publicar la historia';
}
