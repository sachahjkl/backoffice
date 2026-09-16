import { TestBed } from '@angular/core/testing';

import { DocumentPreview } from './document-preview';
import { PdfDocuments, type PreviewDocument } from './pdf-documents';

class FakePdfDocuments {
  readonly calls: Array<{ readonly url: string; readonly zoom: number }> = [];
  readonly open = vi.fn(async (url: string): Promise<PreviewDocument> => {
    this.calls.push({ url, zoom: 0 });
    return {
      pages: [1, 2].map(() => ({
        render: async (_canvas: HTMLCanvasElement, zoom: number) => {
          this.calls.push({ url, zoom });
        },
      })),
      destroy: async () => undefined,
    };
  });
}

function create() {
  const fixture = TestBed.createComponent(DocumentPreview);
  fixture.componentRef.setInput('url', '/api/invoices/01HF7YAT000000000000000NFN/preview');
  fixture.componentRef.setInput('title', 'Aperçu de la facture');
  fixture.componentRef.setInput('loadingLabel', 'Loading preview');
  fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
  return fixture;
}

describe('DocumentPreview', () => {
  let documents: FakePdfDocuments;

  beforeEach(() => {
    documents = new FakePdfDocuments();
    TestBed.configureTestingModule({
      providers: [{ provide: PdfDocuments, useValue: documents }],
    });
  });

  it('renders every page of the previewed document', async () => {
    const fixture = create();
    await vi.waitFor(() => expect(documents.calls.length).toBe(3));
    const root: HTMLElement = fixture.nativeElement;
    expect(documents.open).toHaveBeenCalledWith('/api/invoices/01HF7YAT000000000000000NFN/preview');
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.querySelectorAll('canvas')).toHaveLength(2);
    expect(documents.calls.slice(1).map(({ zoom }) => zoom)).toEqual([1, 1]);
  });

  it('reports an unavailable preview without rendering a page', async () => {
    documents.open.mockRejectedValueOnce(new Error('preview.failed'));
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    await vi.waitFor(() =>
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('Preview unavailable'),
    );
    expect(root.querySelector('canvas')).toBeNull();
  });

  it('zooms the rendered pages within the supported bounds', async () => {
    const fixture = create();
    await vi.waitFor(() => expect(documents.calls.length).toBe(3));
    const root: HTMLElement = fixture.nativeElement;
    const [zoomOut, zoomIn] = Array.from(root.querySelectorAll('button'));
    if (zoomOut === undefined || zoomIn === undefined) throw new Error('preview.zoom.missing');
    expect(root.querySelector('.zoom-value')?.textContent).toContain('100');
    zoomIn.click();
    await vi.waitFor(() => expect(root.querySelector('.zoom-value')?.textContent).toContain('125'));
    expect(documents.calls.at(-1)?.zoom).toBe(1.25);
    zoomOut.click();
    zoomOut.click();
    await vi.waitFor(() => expect(root.querySelector('.zoom-value')?.textContent).toContain('75'));
    zoomOut.click();
    await vi.waitFor(() => expect(zoomOut.disabled).toBe(true));
    expect(zoomIn.disabled).toBe(false);
  });
});
