import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

/** Centro por defecto: Villa María, Córdoba. */
const DEFAULT_CENTER: L.LatLngTuple = [-32.4103, -63.24];
const DEFAULT_ZOOM = 15;
const PICKED_ZOOM = 16;

/**
 * Selector de ubicación sobre OpenStreetMap. El pin se coloca tocando el mapa
 * o arrastrándolo; emite las coordenadas elegidas.
 */
@Component({
  selector: 'hn-map-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="map" #host></div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .map {
        height: 220px;
        border-radius: var(--hn-radius-md, 14px);
        border: 1px solid var(--hn-border);
        overflow: hidden;
        z-index: 0;
        cursor: crosshair;
      }
      @media (min-width: 768px) {
        .map {
          height: 280px;
        }
      }
    `,
  ],
})
export class MapPicker implements OnDestroy {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly picked = output<{ lat: number; lng: number }>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private tileLayer: L.TileLayer | null = null;
  /**
   * True mientras el cambio de lat/lng lo originó el propio mapa (click o
   * arrastre del pin). Evita que el effect recentre y haga zoom en respuesta a
   * una interacción que ya movió el pin donde el usuario quiso.
   */
  private selfUpdate = false;

  constructor() {
    // El mapa se crea recién cuando el contenedor tiene alto real. Si se creara
    // con alto 0 (layout aún sin aplicar), Leaflet fijaría un tamaño chico y
    // sólo tejaría una banda; parcharlo después con invalidateSize no re-teja de
    // forma confiable. Crear con el tamaño correcto desde el arranque lo evita.
    afterNextRender(() => this.waitForSizeThenInit());

    // Reposiciona el pin cuando la ubicación cambia desde afuera (buscador).
    // Si el cambio vino del propio mapa, no se toca la vista.
    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (!this.map || lat === null || lng === null) return;
      if (this.selfUpdate) {
        this.selfUpdate = false;
        return;
      }
      this.placeMarker(lat, lng);
      this.map.setView([lat, lng], Math.max(this.map.getZoom(), PICKED_ZOOM));
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  /**
   * Espera a que el contenedor tenga un tamaño ESTABLE (mismo alto en dos
   * frames seguidos) antes de crear el mapa. Crear el mapa con el tamaño final
   * de entrada evita tener que reajustarlo después con invalidateSize/redraw:
   * esos reajustes, encadenados, dejaban las tiles en distintos "levels" y
   * corrompían la grilla (huecos, columnas desalineadas, clicks corridos).
   */
  private waitForSizeThenInit(): void {
    const el = this.host().nativeElement;
    let lastHeight = -1;
    const check = () => {
      const h = el.clientHeight;
      if (h > 0 && h === lastHeight) {
        this.initMap();
        return;
      }
      lastHeight = h;
      requestAnimationFrame(check);
    };
    check();
  }

  private initMap(): void {
    const lat = this.latitude();
    const lng = this.longitude();
    const center: L.LatLngTuple = lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER;

    this.map = L.map(this.host().nativeElement, {
      center,
      zoom: lat !== null ? PICKED_ZOOM : DEFAULT_ZOOM,
      attributionControl: true,
      // Sin animaciones de zoom: son las que dejan tiles a media escala si se
      // interrumpen. Con el tamaño ya estable no hacen falta.
      zoomAnimation: false,
      markerZoomAnimation: false,
    });

    this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.placeMarker(event.latlng.lat, event.latlng.lng);
      this.selfUpdate = true;
      this.picked.emit({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    if (lat !== null && lng !== null) {
      this.placeMarker(lat, lng);
    }
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
      return;
    }
    this.marker = L.marker([lat, lng], {
      draggable: true,
      // Ícono propio (SVG tipo gota): evita los assets de Leaflet, que el
      // bundler no resuelve. Borde blanco + sombra para que se vea sobre
      // cualquier fondo (calle o campo). El markup va inline porque Leaflet
      // inyecta este nodo fuera del scope de estilos del componente.
      icon: L.divIcon({
        className: '',
        html:
          '<svg width="30" height="40" viewBox="0 0 30 40" ' +
          'style="filter:drop-shadow(0 3px 4px rgba(46,24,10,.5))">' +
          '<path d="M15 1C7.8 1 2 6.8 2 14c0 9 13 25 13 25s13-16 13-25' +
          'C28 6.8 22.2 1 15 1z" fill="#a04e22" stroke="#fff" ' +
          'stroke-width="2.5"/>' +
          '<circle cx="15" cy="14" r="5" fill="#fff"/></svg>',
        iconSize: [30, 40],
        iconAnchor: [15, 39],
      }),
    }).addTo(this.map);

    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.selfUpdate = true;
      this.picked.emit({ lat: pos.lat, lng: pos.lng });
    });
  }
}
