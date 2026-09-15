import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DocumentPreview, DocumentPreviewLoader } from './document-preview';

describe('DocumentPreview', () => {
  it('loads an authenticated PDF into a disposable object URL', async () => {
    const load = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: DocumentPreviewLoader, useValue: { load } }],
    });
    const fixture = TestBed.createComponent(DocumentPreview);
    fixture.componentRef.setInput('url', '/api/documents/preview');
    fixture.componentRef.setInput('title', 'Document preview');
    fixture.componentRef.setInput('loadingLabel', 'Loading preview');
    fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
    fixture.componentRef.setInput('openLabel', 'Open preview');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(load).toHaveBeenCalledExactlyOnceWith('/api/documents/preview');
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(root.querySelector('iframe')?.getAttribute('src')).toBe('blob:preview');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('blob:preview');
    fixture.destroy();
    expect(revokeObjectUrl).toHaveBeenCalledExactlyOnceWith('blob:preview');
  });
});
