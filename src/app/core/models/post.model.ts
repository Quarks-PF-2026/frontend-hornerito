import { PostMedia } from './media.model';

export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Adjuntos, del más viejo al más nuevo. `POST`/`PUT /posts` no los devuelven. */
  media: PostMedia[];
}
