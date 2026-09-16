import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface PreviewPage {
  render(canvas: HTMLCanvasElement, zoom: number): Promise<void>;
}

export interface PreviewDocument {
  readonly pages: ReadonlyArray<PreviewPage>;
  destroy(): Promise<void>;
}

const renderScale = 2;

// The browser policy may download PDFs instead of displaying them.
// Render preview pages in the application so every client shows the same result.
@Injectable({ providedIn: 'root' })
export class PdfDocuments {
  private readonly http = inject(HttpClient);

  async open(url: string): Promise<PreviewDocument> {
    const bytes = await firstValueFrom(this.http.get(url, { responseType: 'arraybuffer' }));
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
    const document = await task.promise;
    const pages: PreviewPage[] = [];
    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index);
      pages.push({
        async render(canvas, zoom) {
          const viewport = page.getViewport({ scale: renderScale * zoom });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const context = canvas.getContext('2d');
          if (context === null) return;
          await page.render({ canvasContext: context, canvas, viewport }).promise;
        },
      });
    }
    return { pages, destroy: () => task.destroy() };
  }
}
