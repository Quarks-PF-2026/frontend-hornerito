import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PostsService } from '../../../../core/services/posts.service';
import { ModalService } from '../../../../core/services/modal.service';

@Component({
  selector: 'app-publicaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class PublicacionesPage {
  private readonly postsSvc = inject(PostsService);
  private readonly modal = inject(ModalService);
  readonly posts = this.postsSvc.posts;

  edit(id: number): void {
    this.modal.editPost(id);
  }
  remove(id: number): void {
    this.modal.confirmDeletePost(id);
  }
}
