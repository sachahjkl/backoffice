import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Injectable,
  input,
  OnChanges,
  PendingTasks,
  type SimpleChanges,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Button } from '@shared/button/button';
import { Notice } from '@shared/notice/notice';

@Injectable({ providedIn: 'root' })
export class DocumentPreviewLoader {
  private readonly http = inject(HttpClient);

  load(url: string): Promise<Blob> {
    return firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }
}

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
  protected readonly objectUrl = signal<string | undefined>(undefined);
  private readonly loader = inject(DocumentPreviewLoader);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  private generation = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.generation++;
      this.release();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] === undefined) return;
    const finishLoading = this.pendingTasks.add();
    void this.load().finally(finishLoading);
  }

  private async load(): Promise<void> {
    const generation = ++this.generation;
    this.release();
    this.frameUrl.set(undefined);
    this.failed.set(false);
    this.loading.set(true);
    try {
      const pdf = await this.loader.load(this.url());
      if (this.destroyRef.destroyed || generation !== this.generation) return;
      const objectUrl = URL.createObjectURL(pdf);
      this.objectUrl.set(objectUrl);
      this.frameUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
    } catch {
      if (!this.destroyRef.destroyed && generation === this.generation) this.failed.set(true);
    } finally {
      if (!this.destroyRef.destroyed && generation === this.generation) this.loading.set(false);
    }
  }

  private release(): void {
    const objectUrl = this.objectUrl();
    if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl);
    this.objectUrl.set(undefined);
  }
}
