/** Catálogo fijo de categorías y unidades, con íconos y colores por categoría. */
export const CATS = ['Alimentos secos', 'Frescos', 'Limpieza', 'Higiene', 'Bebidas'] as const;
export const UNITS = ['Kilogramos', 'Litros', 'Unidades', 'Paquetes', 'Cajas'] as const;

export const CAT_ICON: Record<string, string> = {
  'Alimentos secos': '🌾',
  Frescos: '🥛',
  Limpieza: '🧴',
  Higiene: '🧼',
  Bebidas: '🧃',
};

export const CAT_BG: Record<string, string> = {
  'Alimentos secos': '#F5E9D8',
  Frescos: '#EAF2F6',
  Limpieza: '#E6F0E7',
  Higiene: '#F1ECF6',
  Bebidas: '#FBEFD4',
};

export const DEFAULT_CAT_ICON = '📦';
export const DEFAULT_CAT_BG = '#F5E9D8';
