import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { PostsService } from '../../../../core/services/posts.service';
import { ModalService } from '../../../../core/services/modal.service';
import { fmtDate } from '../../../../core/util/format';

@Component({
  selector: 'app-publicaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class PublicacionesPage {
  private readonly auth = inject(AuthService);
  readonly canWrite = this.auth.canWriteContent;
  private readonly postsSvc = inject(PostsService);
  private readonly modal = inject(ModalService);
  readonly posts = this.postsSvc.posts;
  readonly fmtDate = (createdAt: string) => fmtDate(createdAt.slice(0, 10));

  constructor() {
    this.postsSvc.load().subscribe();
  }

  edit(id: string): void {
    this.modal.editPost(id);
  }
  remove(id: string): void {
    this.modal.confirmDeletePost(id);
  }
}
