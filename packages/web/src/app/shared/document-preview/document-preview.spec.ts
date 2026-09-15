import { TestBed } from '@angular/core/testing';
import { Authentication } from '@backoffice/authentication';
import { vi } from 'vitest';
import { DocumentPreview } from './document-preview';

describe('DocumentPreview', () => {
  it('refreshes the session before it loads the protected PDF URL', async () => {
    const refreshSession = vi.fn().mockResolvedValue('administrator');
    TestBed.configureTestingModule({
      providers: [{ provide: Authentication, useValue: { refreshSession } }],
    });
    const fixture = TestBed.createComponent(DocumentPreview);
    fixture.componentRef.setInput('url', '/api/documents/preview');
    fixture.componentRef.setInput('title', 'Document preview');
    fixture.componentRef.setInput('loadingLabel', 'Loading preview');
    fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
    fixture.componentRef.setInput('openLabel', 'Open preview');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(root.querySelector('iframe')?.getAttribute('src')).toBe('/api/documents/preview');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/api/documents/preview');
  });
});
