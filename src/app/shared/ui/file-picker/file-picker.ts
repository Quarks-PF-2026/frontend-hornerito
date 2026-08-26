import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Selector de archivo con la pinta del design system.
 *
 * El control nativo (`Choose File / No file chosen`) no se puede estilar ni
 * traducir, así que se esconde detrás de un `<label>` que hace de botón —
 * mismo recurso que usa `hn-image-upload`. Se oculta con `opacity` y no con
 * `display: none` para que siga siendo alcanzable con el teclado.
 *
 * A diferencia de `hn-image-upload`, este no sube nada: solo emite el archivo
 * elegido para que el formulario lo mande junto con el resto.
 */
@Component({
  selector: 'hn-file-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="pick hn-btn hn-btn--outline hn-btn--block">
      <input type="file" [accept]="accept()" (change)="onPick($event)" />
      {{ file() ? '🔁 ' + changeLabel() : '📎 ' + label() }}
    </label>
    <p class="hint">{{ file()?.name ?? hint() }}</p>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .pick {
        position: relative;
      }
      .pick input {
        position: absolute;
        inset: 0;
        opacity: 0;
      }
      .hint {
        margin: 4px 0 6px;
        font-size: 13.5px;
        color: var(--hn-muted);
        word-break: break-all;
      }
    `,
  ],
})
export class FilePicker {
  readonly accept = input('');
  readonly label = input('Adjuntar archivo');
  readonly changeLabel = input('Cambiar archivo');
  /** Se muestra debajo mientras no hay archivo elegido. */
  readonly hint = input('');
  readonly file = input<File | null>(null);

  readonly picked = output<File | null>();

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.picked.emit(input.files?.[0] ?? null);
  }
}
