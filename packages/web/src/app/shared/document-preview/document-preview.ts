import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  type OnChanges,
  PLATFORM_ID,
  type SimpleChanges,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { I18nService } from '@app/i18n.service';
import { Notice } from '@shared/notice/notice';
import { PdfDocuments, type PreviewDocument } from './pdf-documents';

type PreviewState = 'loading' | 'ready' | 'error';

const minimumZoom = 0.5;
const maximumZoom = 2;
const zoomStep = 0.25;

@Component({
  selector: 'app-document-preview',
  imports: [Notice],
  templateUrl: './document-preview.html',
  styleUrl: './document-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreview implements OnChanges {
  readonly url = input.required<string>();
  readonly title = input.required<string>();
  readonly loadingLabel = input.required<string>();
  readonly errorLabel = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly state = signal<PreviewState>('loading');
  protected readonly zoom = signal(1);
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  protected readonly canZoomOut = computed(() => this.zoom() > minimumZoom);
  protected readonly canZoomIn = computed(() => this.zoom() < maximumZoom);
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  // Resolve the renderer on demand so a preview never fails without an HTTP client.
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private document: PreviewDocument | undefined;
  private canvases: ReadonlyArray<HTMLCanvasElement> = [];
  private generation = 0;
  private paintGeneration = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.generation++;
      this.paintGeneration++;
      void this.release();
    });
    effect(() => {
      const surface = this.surface();
      if (surface === undefined || this.state() !== 'ready') return;
      untracked(() => void this.paint());
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] === undefined || !this.browser) return;
    void this.load();
  }

  protected zoomIn(): void {
    this.applyZoom(Math.min(maximumZoom, this.zoom() + zoomStep));
  }

  protected zoomOut(): void {
    this.applyZoom(Math.max(minimumZoom, this.zoom() - zoomStep));
  }

  private applyZoom(value: number): void {
    if (value === this.zoom()) return;
    this.zoom.set(value);
    void this.paint();
  }

  private async load(): Promise<void> {
    const generation = ++this.generation;
    this.state.set('loading');
    this.zoom.set(1);
    await this.release();
    if (this.stale(generation)) return;
    try {
      const document = await this.injector.get(PdfDocuments).open(this.url());
      if (this.stale(generation)) {
        await document.destroy();
        return;
      }
      this.document = document;
      this.canvases = document.pages.map(() => this.createCanvas());
      this.state.set('ready');
    } catch {
      if (!this.stale(generation)) this.state.set('error');
    }
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = 'preview-page';
    return canvas;
  }

  private async paint(): Promise<void> {
    const generation = this.generation;
    const paint = ++this.paintGeneration;
    const surface = this.surface()?.nativeElement;
    const document = this.document;
    if (surface === undefined || document === undefined || this.state() !== 'ready') return;
    surface.replaceChildren();
    for (const [index, page] of document.pages.entries()) {
      const canvas = this.canvases[index];
      if (canvas === undefined) continue;
      surface.append(canvas);
      if (this.stale(generation) || paint !== this.paintGeneration) return;
      await page.render(canvas, this.zoom());
    }
  }

  private stale(generation: number): boolean {
    return this.destroyRef.destroyed || generation !== this.generation;
  }

  private async release(): Promise<void> {
    const document = this.document;
    this.document = undefined;
    this.canvases = [];
    if (document !== undefined) await document.destroy();
  }
}
