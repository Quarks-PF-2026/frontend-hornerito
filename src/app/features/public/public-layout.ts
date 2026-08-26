import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Marco de la parte pública: cabecera con la marca y el acceso a la app, y el
 * contenido ruteado. No usa `hn-bottom-nav` (eso es navegación del panel de la
 * organización).
 */
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
  host: { class: 'hn-fill' },
})
export class PublicLayout {
  private readonly auth = inject(AuthService);
  readonly authenticated = this.auth.authenticated;
}
