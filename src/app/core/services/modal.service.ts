import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CATS, UNITS } from '../models/catalog';
import { OrgService } from './org.service';
import { PostsService } from './posts.service';
import { NeedsService } from './needs.service';
import { SuppliesService } from './supplies.service';
import { ToastService } from './toast.service';

export type ModalKind = 'org' | 'post' | 'need' | 'progress' | 'supply' | 'confirm' | 'preview';
export type FieldType = 'text' | 'textarea' | 'select' | 'date';

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
  sub?: 'post';
}

const FORM_KINDS: ModalKind[] = ['org', 'post', 'need', 'progress', 'supply'];

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly orgSvc = inject(OrgService);
  private readonly postsSvc = inject(PostsService);
  private readonly needsSvc = inject(NeedsService);
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly toast = inject(ToastService);

  private readonly _modal = signal<ModalState | null>(null);
  private readonly _form = signal<Record<string, string | boolean>>({});
  private readonly _errors = signal<Record<string, string>>({});

  readonly modal = this._modal.asReadonly();
  readonly form = this._form.asReadonly();
  readonly errors = this._errors.asReadonly();

  readonly isOpen = computed(() => this._modal() !== null);
  readonly isForm = computed(() => {
    const m = this._modal();
    return !!m && FORM_KINDS.includes(m.kind);
  });
  readonly isConfirm = computed(() => this._modal()?.kind === 'confirm');
  readonly isPreview = computed(() => this._modal()?.kind === 'preview');

  readonly confirmTitle = '¿Eliminar publicación?';
  readonly confirmText =
    'Esta acción no se puede deshacer. La publicación dejará de mostrarse en tu feed.';

  // ---------------- apertura ----------------
  private open(state: ModalState, form: Record<string, string | boolean> = {}): void {
    this._modal.set(state);
    this._form.set(form);
    this._errors.set({});
  }

  close(): void {
    this._modal.set(null);
    this._form.set({});
    this._errors.set({});
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
    this.open({ kind: 'supply', mode: 'edit', id }, { name: s.name, category: s.category, unit: s.unit });
  }

  // ---------------- edición de campos ----------------
  setField(key: string, value: string | boolean): void {
    this._form.update((f) => ({ ...f, [key]: value }));
    this._errors.update((e) => ({ ...e, [key]: '' }));
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
          this.text('contact', 'Contacto', 'Teléfono y/o correo', e),
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
          this.select('category', 'Categoría', CATS.map((c) => ({ value: c, label: c })), e),
          this.select('unit', 'Unidad de medida', UNITS.map((u) => ({ value: u, label: u })), e),
        ];
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
  private text(key: string, label: string, ph: string, e: Record<string, string>, inputmode = 'text'): FormField {
    return { ...this.base(key, label, e), type: 'text', placeholder: ph, inputmode };
  }
  private area(key: string, label: string, ph: string, e: Record<string, string>): FormField {
    return { ...this.base(key, label, e), type: 'textarea', placeholder: ph };
  }
  private select(key: string, label: string, options: SelectOption[], e: Record<string, string>): FormField {
    return { ...this.base(key, label, e), type: 'select', options };
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
      if (!address.trim()) errs['address'] = 'La dirección es obligatoria. No se puede guardar sin dirección.';
      if (!contact.trim()) errs['contact'] = 'El contacto es obligatorio.';
      if (this.fail(errs)) return;
      const resent = this.orgSvc.org()?.status === 'rejected';
      this.orgSvc.save({ name, description, address, contact }).subscribe({
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
      request$.subscribe({
        next: () => {
          this.close();
          this.toast.show(m.mode === 'new' ? 'Publicación creada' : 'Publicación actualizada');
        },
        error: () => {
          this._errors.set({ title: 'No se pudo guardar. Intentá de nuevo.' });
        },
      });
      return;
    }

    if (m.kind === 'need') {
      const req = parseInt(this.str('required'), 10);
      const deadline = this.str('deadline');
      if (!this.str('required') || isNaN(req) || req <= 0) errs['required'] = 'Ingresá una cantidad mayor a cero.';
      if (!deadline) errs['deadline'] = 'Elegí una fecha límite.';
      if (this.fail(errs)) return;
      const data = { supplyId: this.str('supplyId'), requiredQuantity: req, deadline };
      const request$ =
        m.mode === 'new'
          ? this.needsSvc.create(data)
          : this.needsSvc.update(m.id as string, data);
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
    }
  }

  confirmAction(): void {
    const m = this._modal();
    if (m?.kind === 'confirm' && m.sub === 'post') {
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
    }
  }

  private fail(errs: Record<string, string>): boolean {
    if (Object.keys(errs).length) {
      this._errors.set(errs);
      return true;
    }
    return false;
  }
}
