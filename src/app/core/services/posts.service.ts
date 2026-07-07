import { Injectable, signal } from '@angular/core';
import { Post } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly _posts = signal<Post[]>([
    {
      id: 1,
      title: '¡Gracias por las donaciones de invierno!',
      content:
        'Esta semana recibimos frazadas y alimentos no perecederos. Gracias a cada vecino y vecina que se acercó. Seguimos necesitando leche y aceite.',
      date: '24 jun',
      hasImage: true,
    },
    {
      id: 2,
      title: 'Merienda reforzada los miércoles',
      content:
        'Desde junio sumamos merienda reforzada los miércoles a la tarde. Si querés colaborar con la copa de leche, escribinos.',
      date: '18 jun',
      hasImage: false,
    },
  ]);
  readonly posts = this._posts.asReadonly();
  private nextId = 3;

  add(data: Pick<Post, 'title' | 'content' | 'hasImage'>): void {
    this._posts.update((list) => [{ id: this.nextId++, date: 'hoy', ...data }, ...list]);
  }

  update(id: number, data: Pick<Post, 'title' | 'content' | 'hasImage'>): void {
    this._posts.update((list) => list.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  remove(id: number): void {
    this._posts.update((list) => list.filter((p) => p.id !== id));
  }

  find(id: number): Post | undefined {
    return this._posts().find((p) => p.id === id);
  }
}
