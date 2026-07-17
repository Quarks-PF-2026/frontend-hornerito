import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Post } from '../models/post.model';

export type PostPatch = Pick<Post, 'title' | 'content'>;

@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _posts = signal<Post[]>([]);
  readonly posts = this._posts.asReadonly();

  load(): Observable<Post[]> {
    return this.http
      .get<Post[]>(`${this.apiUrl}/posts`)
      .pipe(tap((posts) => this._posts.set(posts)));
  }

  create(data: PostPatch): Observable<Post> {
    return this.http
      .post<Post>(`${this.apiUrl}/posts`, data)
      .pipe(tap((post) => this._posts.update((list) => [post, ...list])));
  }

  update(id: string, data: PostPatch): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${id}`, data).pipe(
      tap((post) =>
        this._posts.update((list) => list.map((p) => (p.id === id ? post : p))),
      ),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`).pipe(
      tap(() => this._posts.update((list) => list.filter((p) => p.id !== id))),
    );
  }

  find(id: string): Post | undefined {
    return this._posts().find((p) => p.id === id);
  }
}
