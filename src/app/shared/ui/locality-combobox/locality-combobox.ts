import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { localityLabel } from '../../../core/models/org.model';
import { PublicLocality } from '../../../core/models/public.model';
import { LocalityPipe } from '../../pipes/locality.pipe';

/** Minúsculas y sin tildes: "villa maria" encuentra "Villa María". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

let nextId = 0;

/**
 * Filtro de localidad del inicio: combobox con autocompletado sobre las
 * localidades que ya tienen organizaciones (patrón ARIA 1.2 "combobox with
 * listbox popup"). Reemplaza al `<select>` nativo, que no permitía tipear y se
 * veía distinto en cada navegador.
 *
 * No es `hn-locality-picker`: aquel busca en el geocoder para cargar la
 * dirección de una organización; este solo elige entre opciones conocidas.
 */
@Component({
  selector: 'hn-locality-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalityPipe],
  template: `
    <div class="field" [class.open]="open()">
      <span class="pin" aria-hidden="true">📍</span>
      <input
        class="hn-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        [attr.aria-label]="label"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeId()"
        [placeholder]="selectedLabel() || 'Todas las localidades'"
        [class.has-value]="!!value()"
        [value]="query()"
        (input)="onType($any($event.target).value)"
        (focus)="openList()"
        (click)="openList()"
        (blur)="close()"
        (keydown)="onKey($event)"
      />
      @if (value()) {
        <button
          class="clear"
          type="button"
          aria-label="Quitar filtro de localidad"
          (mousedown)="$event.preventDefault()"
          (click)="choose(null)"
        >
          ✕
        </button>
      } @else {
        <span class="caret" aria-hidden="true">▾</span>
      }
    </div>

    @if (open()) {
      <ul class="panel" role="listbox" [id]="listId" [attr.aria-label]="label">
        @for (opt of options(); track opt.key; let i = $index) {
          <li
            role="option"
            [id]="listId + '-' + i"
            [class.active]="i === active()"
            [class.selected]="opt.value === value()"
            [attr.aria-selected]="opt.value === value()"
            (mousedown)="$event.preventDefault()"
            (mouseenter)="active.set(i)"
            (click)="choose(opt.value)"
          >
            <span class="opt-label">
              @if (opt.value) {
                {{ opt.locality | hnLocality: opt.province }}
              } @else {
                Todas las localidades
              }
            </span>
            @if (opt.value === value()) {
              <span class="check" aria-hidden="true">✓</span>
            }
          </li>
        } @empty {
          <li class="empty" role="option" aria-disabled="true">
            No hay organizaciones en «{{ query() }}» todavía.
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .field {
        position: relative;
      }
      .pin {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 15px;
        pointer-events: none;
      }
      .hn-input {
        padding-left: 40px;
        padding-right: 44px;
        cursor: pointer;
      }
      .hn-input:focus {
        cursor: text;
      }
      /* Con una localidad elegida, el placeholder la muestra con tinta plena. */
      .hn-input.has-value::placeholder {
        color: var(--hn-ink);
        opacity: 1;
      }
      .caret,
      .clear {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        color: var(--hn-text-2);
        font-size: 14px;
        transition: transform 150ms ease;
      }
      .caret {
        pointer-events: none;
      }
      .open .caret {
        transform: translateY(-50%) rotate(180deg);
      }
      .clear {
        border: none;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-cream-soft);
        cursor: pointer;
        font-size: 12px;
      }
      .clear:hover {
        background: var(--hn-border-soft);
        color: var(--hn-ink);
      }
      .clear:focus-visible {
        outline: 2px solid var(--hn-primary);
        outline-offset: 2px;
      }
      .panel {
        position: absolute;
        z-index: 30;
        left: 0;
        right: 0;
        top: calc(100% + 6px);
        margin: 0;
        padding: 6px;
        list-style: none;
        max-height: 280px;
        overflow-y: auto;
        background: var(--hn-card);
        border: 1px solid var(--hn-border);
        border-radius: var(--hn-radius-md);
        box-shadow: var(--hn-shadow-card);
        animation: hn-pop 140ms ease-out;
      }
      li[role='option'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 44px;
        padding: 0 12px;
        border-radius: var(--hn-radius-sm);
        font-size: 15px;
        color: var(--hn-ink-2);
        cursor: pointer;
      }
      li.active {
        background: var(--hn-cream-soft);
      }
      li.selected {
        font-weight: 700;
        color: var(--hn-primary-strong);
      }
      .check {
        color: var(--hn-primary-strong);
      }
      li.empty {
        cursor: default;
        color: var(--hn-muted);
        font-size: 14px;
      }
      @keyframes hn-pop {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panel {
          animation: none;
        }
        .caret {
          transition: none;
        }
      }
    `,
  ],
})
export class LocalityCombobox {
  readonly localities = input<PublicLocality[]>([]);
  /** Localidad elegida; `null` = todas. */
  readonly value = input<string | null>(null);
  readonly changed = output<string | null>();

  readonly label = 'Filtrar por localidad';
  readonly listId = `hn-locality-list-${nextId++}`;

  readonly query = signal('');
  readonly open = signal(false);
  readonly active = signal(0);

  readonly selectedLabel = computed(() => {
    const current = this.localities().find((l) => l.locality === this.value());
    return current ? localityLabel(current.locality, current.province) : '';
  });

  /** "Todas" va primero solo sin texto tipeado: si se busca, sobra. */
  readonly options = computed(() => {
    const q = fold(this.query().trim());
    const matches = this.localities()
      .filter((l) => !q || fold(`${l.locality} ${l.province ?? ''}`).includes(q))
      .map((l) => ({
        key: l.locality + '|' + (l.province ?? ''),
        value: l.locality as string | null,
        locality: l.locality,
        province: l.province,
      }));
    return q ? matches : [{ key: '__all', value: null, locality: '', province: null }, ...matches];
  });

  readonly activeId = computed(() =>
    this.open() && this.options().length ? `${this.listId}-${this.active()}` : null,
  );

  openList(): void {
    if (this.open()) return;
    const selected = this.options().findIndex((o) => o.value === this.value());
    this.active.set(Math.max(0, selected));
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.query.set('');
  }

  onType(text: string): void {
    this.query.set(text);
    this.active.set(0);
    this.open.set(true);
  }

  onKey(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) return this.openList();
        if (count) this.active.update((i) => (i + 1) % count);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) return this.openList();
        if (count) this.active.update((i) => (i - 1 + count) % count);
        return;
      case 'Enter':
        if (this.open() && count) {
          event.preventDefault();
          this.choose(this.options()[this.active()].value);
        }
        return;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        return;
    }
  }

  choose(value: string | null): void {
    this.close();
    if (value !== this.value()) this.changed.emit(value);
  }
}
