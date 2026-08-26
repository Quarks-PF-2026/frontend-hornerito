// Node 26 define `globalThis.localStorage` como un getter propio que devuelve
// `undefined` salvo que el proceso arranque con `--localstorage-file` (Web
// Storage sigue siendo experimental). El entorno jsdom de Vitest solo agrega al
// global lo que todavía no existe, así que ese getter le gana al Storage de
// jsdom y los specs ven `undefined` donde el browser tiene un Storage real.
//
// Bajo Node 22 no pasaba: el global no existía y jsdom lo instalaba. Se
// reemplaza por un Storage en memoria, que es lo que un test necesita —
// aislado por proceso y sin tocar disco. En el browser esto no corre.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }

  [name: string]: unknown;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!globalThis[name]) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
    });
  }
}
