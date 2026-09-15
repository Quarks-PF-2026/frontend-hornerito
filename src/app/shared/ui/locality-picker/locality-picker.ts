import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { PickedLocality, localityLabel } from '../../../core/models/org.model';
import { GeocodeResult, GeocodingService } from '../../../core/services/geocoding.service';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 800;

/**
 * Campo de localidad con sugerencias del geocoder.
 *
 * Lo que se tipea es transitorio: vive en `query` y nunca sale del componente.
 * Solo elegir una sugerencia emite `picked`. Es lo que hace cierta la regla de
 * QK-112 de que la localidad no se escribe a mano — dos organizaciones de la
 * misma localidad quedan escritas igual porque las dos la eligieron de acá.
 *
 * El buscador es una ayuda, no un requisito: sin sugerencias se avisa en una
 * línea y el formulario se guarda igual. Nunca bloquea.
 */
@Component({
  selector: 'hn-locality-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      class="hn-input"
      type="text"
      [placeholder]="placeholder()"
      [value]="query() ?? value()"
      (input)="onType($event)"
    />
    @if (searching()) {
      <div class="hint">Buscando localidades…</div>
    } @else if (options().length) {
      <div class="results">
        @for (option of options(); track option.label) {
          <button class="result" type="button" (click)="pick(option)">{{ option.label }}</button>
        }
      </div>
    } @else if (sinResultados()) {
      <div class="hint">Sin sugerencias para esa búsqueda.</div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .hint {
        font-size: 12.5px;
        color: var(--hn-muted);
        margin-top: 6px;
      }
      .results {
        margin-top: 6px;
        border: 1px solid var(--hn-border);
        border-radius: var(--hn-radius-md, 14px);
        overflow: hidden;
        background: var(--hn-card);
      }
      .result {
        display: block;
        width: 100%;
        text-align: left;
        padding: 10px 12px;
        border: none;
        background: none;
        font: inherit;
        font-size: 13px;
        color: var(--hn-text);
        cursor: pointer;
        border-bottom: 1px solid var(--hn-border-line);
      }
      .result:last-child {
        border-bottom: none;
      }
      .result:hover {
        background: var(--hn-cream-soft);
      }
    `,
  ],
})
export class LocalityPicker {
  private readonly geocoding = inject(GeocodingService);

  /** Localidad ya guardada, mostrada hasta que el usuario empiece a escribir. */
  readonly value = input('');
  readonly placeholder = input('Ej: Villa María');
  readonly picked = output<PickedLocality>();

  /** Lo tipeado. `null` = todavía no tocó el campo, se muestra `value()`. */
  readonly query = signal<string | null>(null);
  readonly searching = signal(false);
  readonly options = signal<{ label: string; value: PickedLocality }[]>([]);
  readonly sinResultados = signal(false);

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((q) => this.geocoding.search(q)),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        const options = this.toOptions(results);
        this.options.set(options);
        this.searching.set(false);
        this.sinResultados.set(options.length === 0);
      });
  }

  onType(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.query.set(text);
    this.options.set([]);
    this.sinResultados.set(false);
    if (text.trim().length < MIN_CHARS) {
      this.searching.set(false);
      return;
    }
    this.searching.set(true);
    this.query$.next(text);
  }

  pick(option: { label: string; value: PickedLocality }): void {
    // Vuelve a `null` para que el input muestre el `value()` que baje del
    // formulario: lo que vale es lo elegido, no lo que quedó tipeado.
    this.query.set(null);
    this.options.set([]);
    this.sinResultados.set(false);
    this.picked.emit(option.value);
  }

  /**
   * Una búsqueda de direcciones devuelve varios puntos de la misma localidad
   * (distintas calles). Acá interesa la localidad, así que se descartan las
   * sugerencias sin ella y se deduplica: una fila por localidad.
   */
  private toOptions(results: GeocodeResult[]): { label: string; value: PickedLocality }[] {
    const byKey = new Map<string, { label: string; value: PickedLocality }>();
    for (const result of results) {
      if (!result.locality) continue;
      const value: PickedLocality = {
        locality: result.locality,
        province: result.province,
        country: result.country,
      };
      const key = `${value.locality}|${value.province}|${value.country}`;
      if (!byKey.has(key)) {
        byKey.set(key, { label: localityLabel(value.locality, value.province), value });
      }
    }
    return [...byKey.values()];
  }
}
