import { Pipe, PipeTransform } from '@angular/core';
import { localityLabel } from '../../core/models/org.model';

/**
 * "Villa María, Córdoba" a partir de localidad y provincia (QK-112).
 *
 * Es un pipe puro y no un `computed()` porque el listado del directorio arma
 * la etiqueta dentro de un `@for`: ahí no hay una señal por fila de la que
 * derivar. Puro, así que Angular lo evalúa solo cuando cambian los argumentos.
 */
@Pipe({ name: 'hnLocality' })
export class LocalityPipe implements PipeTransform {
  transform(locality: string | null, province: string | null): string {
    return localityLabel(locality, province);
  }
}
