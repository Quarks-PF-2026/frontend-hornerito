import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CATS, UNITS } from '../models/catalog';
import { EventKind } from '../models/event.model';
import { PickedLocality, localityLabel } from '../models/org.model';
import {
  MediaResourceType,
  POST_IMAGE_MAX_BYTES,
  POST_MEDIA_ACCEPT,
  POST_MEDIA_MAX,
  POST_VIDEO_MAX_BYTES,
  PostMedia,
  mediaKindOf,
} from '../models/media.model';
import { EventsService } from './events.service';
import { MediaService } from './media.service';
import { OrgService } from './org.service';
import { PostsService } from './posts.service';
import { NeedsService } from './needs.service';
import { SuppliesService } from './supplies.service';
import { ToastService } from './toast.service';

export type ModalKind =
  'org' | 'post' | 'need' | 'progress' | 'supply' | 'event' | 'confirm' | 'preview';
export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'locality';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  value: string;
  placeholder: string;
  inputmode: string;
  options: SelectOption[];
  error: string;
}

interface ModalState {
  kind: ModalKind;
  mode?: 'new' | 'edit';
  id?: number | string | null;
  sub?: 'post' | 'event';
}

/** Adjunto en el modal de publicación: ya guardado (`id`) o elegido y sin subir (`file`). */
export interface AttachmentView {
  key: string;
  url: string;
  isVideo: boolean;
}

interface PendingFile {
  file: File;
  kind: MediaResourceType;
  /** Object URL para la miniatura; también sirve de clave. */
  url: string;
}

const FORM_KINDS: ModalKind[] = ['org', 'post', 'need', 'progress', 'supply', 'event'];

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly orgSvc = inject(OrgService);
  private readonly postsSvc = inject(PostsService);
  private readonly needsSvc = inject(NeedsService);
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly eventsSvc = inject(EventsService);
  private readonly toast = inject(ToastService);
  private readonly mediaSvc = inject(MediaService);

  private readonly _modal = signal<ModalState | null>(null);
  private readonly _form = signal<Record<string, string | boolean>>({});
  private readonly _errors = signal<Record<string, string>>({});

  readonly modal = this._modal.asReadonly();
  readonly form = this._form.asReadonly();
  readonly errors = this._errors.asReadonly();

  // Adjuntos del form `post`. Se aplican recién al guardar: el post nuevo
  // todavía no tiene id contra el cual firmar la subida.
  private readonly _savedMedia = signal<PostMedia[]>([]);
  private readonly _removedMedia = signal<string[]>([]);
  private readonly _pending = signal<PendingFile[]>([]);
  private readonly _busy = signal(false);
  /** "Subiendo 2/3…" mientras corre la secuencia de adjuntos. */
  private readonly _progress = signal('');

  readonly busy = this._busy.asReadonly();
  readonly isPost = computed(() => this._modal()?.kind === 'post');
  readonly attachments = computed<AttachmentView[]>(() => {
    const removed = this._removedMedia();
    return [
      ...this._savedMedia()
        .filter((m) => !removed.includes(m.id))
        .map((m) => ({ key: m.id, url: m.url, isVideo: m.resourceType === 'video' })),
      ...this._pending().map((p) => ({
        key: p.url,
        url: p.url,
        isVideo: p.kind === 'video',
      })),
    ];
  });
  readonly canAddAttachment = computed(() => this.attachments().length < POST_MEDIA_MAX);
  readonly attachmentAccept = POST_MEDIA_ACCEPT;
  readonly saveText = computed(() =>
    this._busy() ? `⏳ ${this._progress() || 'Guardando…'}` : this.saveLabel(),
  );

  readonly isOpen = computed(() => this._modal() !== null);
  readonly isForm = computed(() => {
    const m = this._modal();
    return !!m && FORM_KINDS.includes(m.kind);
  });
  readonly isConfirm = computed(() => this._modal()?.kind === 'confirm');
  readonly isPreview = computed(() => this._modal()?.kind === 'preview');

  readonly confirmTitle = computed(() =>
    this._modal()?.sub === 'event' ? '¿Dar de baja el evento?' : '¿Eliminar publicación?',
  );
  readonly confirmText = computed(() =>
    this._modal()?.sub === 'event'
      ? 'Deja de ofrecerse para cargar nuevas ocurrencias. Las asistencias ya cargadas se conservan.'
      : 'Esta acción no se puede deshacer. La publicación dejará de mostrarse en tu feed.',
  );
  readonly confirmActionLabel = computed(() =>
    this._modal()?.sub === 'event' ? 'Dar de baja' : 'Eliminar',
  );

  // ---------------- apertura ----------------
  private open(state: ModalState, form: Record<string, string | boolean> = {}): void {
    // Mismo motivo que en `close()`: abrir otro modal en medio de la subida
    // borraría los adjuntos pendientes y `syncAttachments` cerraría el nuevo.
    if (this._busy()) return;
    this.resetAttachments();
    this._modal.set(state);
    this._form.set(form);
    this._errors.set({});
  }

  close(): void {
    // Mientras se suben adjuntos el modal no se cierra: el que termina la
    // secuencia es `syncAttachments`, y si se cerrara antes podría pisar otro
    // modal abierto en el medio.
    if (this._busy()) return;
    this.resetAttachments();
    this._modal.set(null);
    this._form.set({});
    this._errors.set({});
  }

  private resetAttachments(): void {
    this._pending().forEach((p) => URL.revokeObjectURL(p.url));
    this._pending.set([]);
    this._savedMedia.set([]);
    this._removedMedia.set([]);
  }

  /**
   * Validación solo para avisar rápido; la que manda es la del backend
   * (tipo, tamaño y tope de adjuntos se revalidan al firmar y confirmar).
   */
  addAttachments(files: File[]): void {
    const accepted: PendingFile[] = [];
    for (const file of files) {
      const kind = mediaKindOf(file);
      if (this.attachments().length + accepted.length >= POST_MEDIA_MAX) {
        this.toast.show(`Máximo ${POST_MEDIA_MAX} adjuntos por publicación`);
        break;
      }
      if (!kind) {
        this.toast.show(
          `${file.name}: formato no admitido. Imágenes JPG, PNG o WEBP; videos MP4, WEBM o MOV`,
        );
        continue;
      }
      const isVideo = kind === 'video';
      if (file.size > (isVideo ? POST_VIDEO_MAX_BYTES : POST_IMAGE_MAX_BYTES)) {
        this.toast.show(`${file.name}: supera los ${isVideo ? 50 : 8} MB`);
        continue;
      }
      accepted.push({ file, kind, url: URL.createObjectURL(file) });
    }
    this._pending.update((list) => [...list, ...accepted]);
  }

  removeAttachment(key: string): void {
    const pending = this._pending().find((p) => p.url === key);
    if (pending) {
      URL.revokeObjectURL(pending.url);
      this._pending.update((list) => list.filter((p) => p !== pending));
    } else {
      this._removedMedia.update((ids) => [...ids, key]);
    }
  }

  editOrg(): void {
    const o = this.orgSvc.org();
    this.open(
      { kind: 'org', mode: 'edit' },
      {
        name: o?.name ?? '',
        description: o?.description ?? '',
        address: o?.address ?? '',
        contact: o?.contact ?? '',
        paymentAlias: o?.paymentAlias ?? '',
        paymentHolder: o?.paymentHolder ?? '',
        paymentCuit: o?.paymentCuit ?? '',
        paymentBank: o?.paymentBank ?? '',
        locality: o?.locality ?? '',
        province: o?.province ?? '',
        country: o?.country ?? '',
      },
    );
  }
  previewOrg(): void {
    this.open({ kind: 'preview' });
  }

  newPost(): void {
    this.open({ kind: 'post', mode: 'new' }, { title: '', content: '' });
  }
  editPost(id: string): void {
    const p = this.postsSvc.find(id);
    if (!p) return;
    this.open({ kind: 'post', mode: 'edit', id }, { title: p.title, content: p.content });
    this._savedMedia.set(p.media ?? []);
  }
  confirmDeletePost(id: string): void {
    this.open({ kind: 'confirm', sub: 'post', id });
  }

  newNeed(): void {
    const first = this.suppliesSvc.active()[0];
    this.open(
      { kind: 'need', mode: 'new' },
      { supplyId: first ? String(first.id) : '', required: '', deadline: '' },
    );
  }
  editNeed(id: string): void {
    const n = this.needsSvc.find(id);
    if (!n) return;
    this.open(
      { kind: 'need', mode: 'edit', id },
      {
        supplyId: String(n.supplyId),
        required: String(n.requiredQuantity),
        deadline: n.deadline,
      },
    );
  }
  progress(id: string): void {
    const n = this.needsSvc.find(id);
    if (!n) return;
    this.open({ kind: 'progress', mode: 'edit', id }, { covered: String(n.coveredQuantity) });
  }

  newSupply(): void {
    this.open({ kind: 'supply', mode: 'new' }, { name: '', category: CATS[0], unit: UNITS[0] });
  }
  editSupply(id: string): void {
    const s = this.suppliesSvc.find(id);
    if (!s) return;
    this.open(
      { kind: 'supply', mode: 'edit', id },
      { name: s.name, category: s.category, unit: s.unit },
    );
  }

  newEvent(): void {
    this.open({ kind: 'event', mode: 'new' }, { name: '', kind: 'periodic', startDate: '' });
  }
  editEvent(id: string): void {
    const ev = this.eventsSvc.find(id);
    if (!ev) return;
    // Nombre y fecha (contrato §PUT /events/:id): cambiar la fecha con
    // asistencias ya cargadas da 409 en el backend. `kind` va solo para el label.
    this.open(
      { kind: 'event', mode: 'edit', id },
      { name: ev.name, kind: ev.kind, startDate: ev.startDate },
    );
  }
  confirmDeactivateEvent(id: string): void {
    this.open({ kind: 'confirm', sub: 'event', id });
  }

  // ---------------- edición de campos ----------------
  setField(key: string, value: string | boolean): void {
    this._form.update((f) => ({ ...f, [key]: value }));
    this._errors.update((e) => ({ ...e, [key]: '' }));
  }

  /**
   * Elegir una sugerencia setea el trío de una: cargarlo campo por campo
   * dejaría una localidad con la provincia de la anterior (Caso 4 de QK-112).
   */
  pickLocality(picked: PickedLocality): void {
    this._form.update((f) => ({
      ...f,
      locality: picked.locality,
      province: picked.province ?? '',
      country: picked.country ?? '',
    }));
  }

  str(key: string): string {
    const v = this._form()[key];
    return typeof v === 'string' ? v : '';
  }
  bool(key: string): boolean {
    return this._form()[key] === true;
  }

  // ---------------- vista del formulario ----------------
  readonly title = computed(() => {
    const m = this._modal();
    if (!m) return '';
    const isNew = m.mode === 'new';
    switch (m.kind) {
      case 'org':
        return 'Editar organización';
      case 'post':
        return isNew ? 'Nueva publicación' : 'Editar publicación';
      case 'need':
        return isNew ? 'Nueva necesidad' : 'Editar necesidad';
      case 'progress':
        return 'Actualizar progreso';
      case 'supply':
        return isNew ? 'Nuevo insumo' : 'Editar insumo';
      case 'event':
        return isNew ? 'Nuevo evento' : 'Editar evento';
      default:
        return '';
    }
  });

  readonly subtitle = computed(() => {
    const m = this._modal();
    if (!m) return '';
    switch (m.kind) {
      case 'org':
        return 'Los datos se muestran en tu perfil público.';
      case 'post':
        return 'Compartí novedades con tu comunidad.';
      case 'need':
        return 'Indicá qué insumo necesitás y cuánto.';
      case 'progress': {
        const n = m.id != null ? this.needsSvc.find(m.id as string) : undefined;
        const sup = n ? this.suppliesSvc.find(n.supplyId) : undefined;
        return n
          ? `Cantidad cubierta de ${n.requiredQuantity} ${sup ? sup.unit.toLowerCase() : ''} de ${sup ? sup.name : ''}`
          : '';
      }
      case 'supply':
        return 'Definí el tipo de insumo del catálogo.';
      case 'event':
        return m.mode === 'new'
          ? 'Un evento periódico se repite; uno extraordinario tiene una única fecha.'
          : 'Solo se puede corregir el nombre.';
      default:
        return '';
    }
  });

  readonly saveLabel = computed(() => {
    const m = this._modal();
    if (!m) return 'Guardar';
    const isNew = m.mode === 'new';
    switch (m.kind) {
      case 'org':
        return 'Guardar cambios';
      case 'post':
        return isNew ? 'Publicar' : 'Guardar';
      case 'need':
        return isNew ? 'Crear necesidad' : 'Guardar';
      case 'progress':
        return 'Actualizar';
      case 'supply':
        return isNew ? 'Agregar insumo' : 'Guardar';
      case 'event':
        return isNew ? 'Crear evento' : 'Guardar';
      default:
        return 'Guardar';
    }
  });

  readonly fields = computed<FormField[]>(() => {
    const m = this._modal();
    if (!m) return [];
    const e = this._errors();
    switch (m.kind) {
      case 'org':
        return [
          this.text('name', 'Nombre del comedor', 'Ej: Comedor Manos del Barrio', e),
          this.area('description', 'Descripción', '¿A quiénes ayudan y cómo?', e),
          this.text('address', 'Dirección', 'Calle, número, ciudad', e),
          // Localidad (QK-112): se elige de las sugerencias, no se escribe a
          // mano, y es opcional — el perfil se guarda igual sin ella.
          this.locality('locality', 'Localidad', e),
          this.text('contact', 'Contacto', 'Teléfono y/o correo', e),
          // Datos bancarios (QK-20): con el alias cargado, la ficha pública
          // ofrece donar dinero. Los cuatro son opcionales.
          this.text('paymentAlias', 'Alias o CBU para donaciones', 'Ej: comedor.manos.barrio', e),
          this.text('paymentHolder', 'Titular de la cuenta', 'Ej: Asociación Manos del Barrio', e),
          this.text('paymentCuit', 'CUIT', 'Ej: 30-71234567-8', e),
          this.text('paymentBank', 'Banco', 'Ej: Banco Nación', e),
        ];
      case 'post':
        return [
          this.text('title', 'Título', 'Ej: Campaña de invierno', e),
          this.area('content', 'Contenido', 'Escribí el detalle de la publicación...', e),
        ];
      case 'need': {
        const opts = this.suppliesSvc
          .active()
          .map((s) => ({ value: String(s.id), label: `${s.name} (${s.unit.toLowerCase()})` }));
        return [
          this.select('supplyId', 'Insumo', opts, e),
          this.text('required', 'Cantidad requerida', 'Ej: 50', e, 'numeric'),
          this.date('deadline', 'Fecha límite', e),
        ];
      }
      case 'progress':
        return [this.text('covered', 'Cantidad cubierta', 'Ej: 30', e, 'numeric')];
      case 'supply':
        return [
          this.text('name', 'Nombre del insumo', 'Ej: Arroz', e),
          this.select(
            'category',
            'Categoría',
            CATS.map((c) => ({ value: c, label: c })),
            e,
          ),
          this.select(
            'unit',
            'Unidad de medida',
            UNITS.map((u) => ({ value: u, label: u })),
            e,
          ),
        ];
      case 'event': {
        const isOneOff = this.str('kind') === 'one_off';
        if (m.mode !== 'new') {
          return [
            this.text('name', 'Nombre del evento', 'Ej: Merienda', e),
            this.date('startDate', isOneOff ? 'Fecha' : 'Desde', e),
          ];
        }
        return [
          this.text('name', 'Nombre del evento', 'Ej: Merienda', e),
          this.select(
            'kind',
            'Tipo',
            [
              { value: 'periodic', label: 'Periódico (se repite)' },
              { value: 'one_off', label: 'Extraordinario (una fecha)' },
            ],
            e,
          ),
          this.date('startDate', isOneOff ? 'Fecha' : 'Desde', e),
        ];
      }
      default:
        return [];
    }
  });

  private base(key: string, label: string, e: Record<string, string>): Omit<FormField, 'type'> {
    return {
      key,
      label,
      value: this.str(key),
      placeholder: '',
      inputmode: 'text',
      options: [],
      error: e[key] ?? '',
    };
  }
  private text(
    key: string,
    label: string,
    ph: string,
    e: Record<string, string>,
    inputmode = 'text',
  ): FormField {
    return { ...this.base(key, label, e), type: 'text', placeholder: ph, inputmode };
  }
  private area(key: string, label: string, ph: string, e: Record<string, string>): FormField {
    return { ...this.base(key, label, e), type: 'textarea', placeholder: ph };
  }
  private select(
    key: string,
    label: string,
    options: SelectOption[],
    e: Record<string, string>,
  ): FormField {
    return { ...this.base(key, label, e), type: 'select', options };
  }
  /** Campo con sugerencias del geocoder. Muestra lo ya elegido, no lo tipeado. */
  private locality(key: string, label: string, e: Record<string, string>): FormField {
    return {
      ...this.base(key, label, e),
      type: 'locality',
      value: localityLabel(this.str('locality') || null, this.str('province') || null),
      placeholder: 'Ej: Villa María',
    };
  }

  private date(key: string, label: string, e: Record<string, string>): FormField {
    return { ...this.base(key, label, e), type: 'date', placeholder: 'AAAA-MM-DD' };
  }

  // ---------------- guardado ----------------
  save(): void {
    const m = this._modal();
    if (!m) return;
    const errs: Record<string, string> = {};

    if (m.kind === 'org') {
      const name = this.str('name');
      const description = this.str('description');
      const address = this.str('address');
      const contact = this.str('contact');
      if (!name.trim()) errs['name'] = 'El nombre es obligatorio.';
      if (!description.trim()) errs['description'] = 'La descripción es obligatoria.';
      if (!address.trim())
        errs['address'] = 'La dirección es obligatoria. No se puede guardar sin dirección.';
      if (!contact.trim()) errs['contact'] = 'El contacto es obligatorio.';
      if (this.fail(errs)) return;
      const resent = this.orgSvc.org()?.status === 'rejected';
      this.orgSvc
        .save({
          name,
          description,
          address,
          contact,
          paymentAlias: this.str('paymentAlias'),
          paymentHolder: this.str('paymentHolder'),
          paymentCuit: this.str('paymentCuit'),
          paymentBank: this.str('paymentBank'),
          // Las tres juntas: el backend las escribe como una unidad, y con
          // `locality` vacío deja la ubicación guardada sin tocar.
          locality: this.str('locality'),
          province: this.str('province'),
          country: this.str('country'),
        })
        .subscribe({
          next: () => {
            this.close();
            this.toast.show(resent ? 'Guardado · reenviado a validación' : 'Cambios guardados');
          },
          error: () => {
            this._errors.set({ name: 'No se pudo guardar. Intentá de nuevo.' });
          },
        });
      return;
    }

    if (m.kind === 'post') {
      const title = this.str('title');
      const content = this.str('content');
      if (!title.trim()) errs['title'] = 'El título es obligatorio.';
      if (!content.trim()) errs['content'] = 'El contenido no puede estar vacío.';
      if (this.fail(errs)) return;
      const data = { title, content };
      const request$ =
        m.mode === 'new' ? this.postsSvc.create(data) : this.postsSvc.update(m.id as string, data);
      this._busy.set(true);
      request$.subscribe({
        next: (post) => void this.syncAttachments(post.id, m.mode === 'new'),
        error: () => {
          this._busy.set(false);
          this._errors.set({ title: 'No se pudo guardar. Intentá de nuevo.' });
        },
      });
      return;
    }

    if (m.kind === 'need') {
      const req = parseInt(this.str('required'), 10);
      const deadline = this.str('deadline');
      if (!this.str('required') || isNaN(req) || req <= 0)
        errs['required'] = 'Ingresá una cantidad mayor a cero.';
      // Sin excepción para la fecha original: si ya pasó, la necesidad está vencida y editarla es reabrirla.
      if (!deadline) errs['deadline'] = 'Elegí una fecha límite.';
      else if (deadline < new Date().toLocaleDateString('en-CA'))
        errs['deadline'] = 'La fecha límite no puede ser anterior a hoy.';
      if (this.fail(errs)) return;
      const data = { supplyId: this.str('supplyId'), requiredQuantity: req, deadline };
      const request$ =
        m.mode === 'new' ? this.needsSvc.create(data) : this.needsSvc.update(m.id as string, data);
      request$.subscribe({
        next: () => {
          this.close();
          this.toast.show(m.mode === 'new' ? 'Necesidad creada' : 'Necesidad actualizada');
        },
        error: () => {
          this._errors.set({ supplyId: 'No se pudo guardar. Intentá de nuevo.' });
        },
      });
      return;
    }

    if (m.kind === 'progress') {
      const cov = parseInt(this.str('covered'), 10);
      if (this.str('covered') === '' || isNaN(cov) || cov < 0) {
        this._errors.set({ covered: 'Ingresá una cantidad válida.' });
        return;
      }
      this.needsSvc.setProgress(m.id as string, cov).subscribe({
        next: (need) => {
          const completed = need.coveredQuantity >= need.requiredQuantity;
          this.close();
          this.toast.show(completed ? '¡Necesidad completada! 🎉' : 'Progreso actualizado');
        },
        error: () => {
          this._errors.set({ covered: 'No se pudo actualizar. Intentá de nuevo.' });
        },
      });
      return;
    }

    if (m.kind === 'supply') {
      const name = this.str('name');
      if (!name.trim()) errs['name'] = 'El nombre es obligatorio.';
      if (this.fail(errs)) return;
      const data = { name: name.trim(), category: this.str('category'), unit: this.str('unit') };
      const request$ =
        m.mode === 'new'
          ? this.suppliesSvc.create(data)
          : this.suppliesSvc.update(String(m.id!), data);
      request$.subscribe({
        next: () => {
          this.close();
          this.toast.show(m.mode === 'new' ? 'Insumo agregado al catálogo' : 'Insumo actualizado');
        },
        error: (err: HttpErrorResponse) => {
          this._errors.set({
            name:
              err.status === 409
                ? (err.error?.message ?? 'Ya existe un insumo con ese nombre.')
                : 'No se pudo guardar. Intentá de nuevo.',
          });
        },
      });
      return;
    }

    if (m.kind === 'event') {
      const name = this.str('name');
      if (!name.trim()) errs['name'] = 'El nombre es obligatorio.';
      if (m.mode === 'new') {
        const startDate = this.str('startDate');
        if (!startDate) errs['startDate'] = 'Elegí una fecha.';
        if (this.fail(errs)) return;
        this.eventsSvc
          .create({ name: name.trim(), kind: this.str('kind') as EventKind, startDate })
          .subscribe({
            next: () => {
              this.close();
              this.toast.show('Evento creado');
            },
            error: (err: HttpErrorResponse) => {
              this._errors.set({ name: err.error?.message ?? 'No se pudo crear el evento.' });
            },
          });
        return;
      }
      const startDate = this.str('startDate');
      if (!startDate) errs['startDate'] = 'Elegí una fecha.';
      if (this.fail(errs)) return;
      this.eventsSvc.update(m.id as string, { name: name.trim(), startDate }).subscribe({
        next: () => {
          this.close();
          this.toast.show('Evento actualizado');
        },
        error: (err: HttpErrorResponse) => {
          const msg = err.error?.message ?? 'No se pudo guardar. Intentá de nuevo.';
          this._errors.set(err.status === 409 ? { startDate: msg } : { name: msg });
        },
      });
    }
  }

  confirmAction(): void {
    const m = this._modal();
    if (m?.kind !== 'confirm') return;
    if (m.sub === 'post') {
      this.postsSvc.remove(m.id as string).subscribe({
        next: () => {
          this.close();
          this.toast.show('Publicación eliminada');
        },
        error: () => {
          this.close();
          this.toast.show('No se pudo eliminar la publicación');
        },
      });
    } else if (m.sub === 'event') {
      this.eventsSvc.deactivate(m.id as string).subscribe({
        next: () => {
          this.close();
          this.toast.show('Evento dado de baja');
        },
        error: () => {
          this.close();
          this.toast.show('No se pudo dar de baja el evento');
        },
      });
    }
  }

  /**
   * Con el post ya guardado: primero borra los adjuntos quitados y después sube
   * los nuevos, de a uno. Ese orden permite reemplazar un adjunto con el post
   * lleno (si subiera primero, el backend rechazaría por tope). Una falla no
   * corta la secuencia ni deshace el post: se avisa qué archivo quedó afuera.
   */
  private async syncAttachments(postId: string, isNew: boolean): Promise<void> {
    const failed: string[] = [];
    for (const id of this._removedMedia()) {
      try {
        await lastValueFrom(this.mediaSvc.remove(id));
        this.postsSvc.patchMedia(postId, (list) => list.filter((x) => x.id !== id));
      } catch {
        failed.push('no se pudo quitar un adjunto');
      }
    }
    const pending = this._pending();
    for (const [i, p] of pending.entries()) {
      this._progress.set(`Subiendo ${i + 1}/${pending.length}…`);
      try {
        const media = await lastValueFrom(this.mediaSvc.uploadAttachment(postId, p.file));
        this.postsSvc.patchMedia(postId, (list) => [...list, media]);
      } catch (err) {
        // Nuestro backend responde `{ message }`; Cloudinary, `{ error: { message } }`.
        const body = (err as HttpErrorResponse).error;
        failed.push(
          `${p.file.name}: ${body?.message ?? body?.error?.message ?? 'no se pudo subir'}`,
        );
      }
    }
    this._busy.set(false);
    this._progress.set('');
    this.close();
    const saved = isNew ? 'Publicación creada' : 'Publicación actualizada';
    this.toast.show(
      failed.length
        ? `${saved}, pero falló ${failed[0]}${failed.length > 1 ? ` (y ${failed.length - 1} más)` : ''}`
        : saved,
    );
  }

  private fail(errs: Record<string, string>): boolean {
    if (Object.keys(errs).length) {
      this._errors.set(errs);
      return true;
    }
    return false;
  }
}
