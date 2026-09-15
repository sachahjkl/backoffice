import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnChanges,
  PendingTasks,
  type SimpleChanges,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { Authentication } from '@backoffice/authentication';
import { Button } from '@shared/button/button';
import { Notice } from '@shared/notice/notice';

@Component({
  selector: 'app-document-preview',
  imports: [Button, Notice],
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreview implements OnChanges {
  readonly url = input.required<string>();
  readonly title = input.required<string>();
  readonly loadingLabel = input.required<string>();
  readonly errorLabel = input.required<string>();
  readonly openLabel = input<string>();
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly frameUrl = signal<SafeResourceUrl | undefined>(undefined);
  private readonly authentication = inject(Authentication);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  private generation = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.generation++;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] === undefined) return;
    const finishLoading = this.pendingTasks.add();
    void this.load().finally(finishLoading);
  }

  private async load(): Promise<void> {
    const generation = ++this.generation;
    this.frameUrl.set(undefined);
    this.failed.set(false);
    this.loading.set(true);
    try {
      const mode = await this.authentication.refreshSession();
      if (this.destroyRef.destroyed || generation !== this.generation) return;
      if (mode === undefined) {
        this.failed.set(true);
        return;
      }
      this.frameUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.url()));
    } catch {
      if (!this.destroyRef.destroyed && generation === this.generation) this.failed.set(true);
    } finally {
      if (!this.destroyRef.destroyed && generation === this.generation) this.loading.set(false);
    }
  }
}
