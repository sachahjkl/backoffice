import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { accountFixture } from '@backoffice/account.spec-helper';
import { AUTH_COOKIE_LOCK_MANAGER } from '@backoffice/auth-cookie-lock';
import { Authentication } from '@backoffice/authentication';
import { BrowserSessionStore } from '@backoffice/browser-session-store';
import { Can } from '@backoffice/can';
import { DocumentPreview } from './document-preview';

const session = () => ({ mode: 'administrator' as const, expiresAt: Date.now() + 600_000 });
const confirmation = (http: HttpTestingController) =>
  vi.waitFor(() => http.expectOne({ method: 'HEAD', url: '/api/auth/account' }));

@Component({
  imports: [Can, DocumentPreview],
  template: `
    <app-document-preview
      *appCan="'document.render'"
      url="/api/documents/preview"
      title="Document preview"
      loadingLabel="Loading preview"
      errorLabel="Preview unavailable"
    />
  `,
})
class PreviewHost {}

describe('DocumentPreview', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_COOKIE_LOCK_MANAGER, useValue: undefined },
      ],
    });
  });

  it.each([true, false])(
    'does not start a refresh loop when document permission after renewal is %s',
    async (allowed) => {
      const authentication = TestBed.inject(Authentication);
      const sessions = TestBed.inject(BrowserSessionStore);
      const http = TestBed.inject(HttpTestingController);
      const account = accountFixture(['document.render']).account();
      if (account === undefined) throw new Error('The test account is missing.');
      sessions.set({ mode: 'administrator', expiresAt: Date.now() + 600_000 });
      const initial = authentication.currentAccount();
      http.expectOne('/api/auth/account').flush(account);
      await initial;
      const fixture = TestBed.createComponent(PreviewHost);
      const root: HTMLElement = fixture.nativeElement;
      (await confirmation(http)).flush(null, { status: 200, statusText: 'OK' });
      await vi.waitFor(() => {
        expect(root.querySelector('iframe')?.getAttribute('src')).toBe('/api/documents/preview');
      });
      http.expectNone('/api/auth/refresh');
      http.verify();

      const refresh = sessions.refresh();
      const reloaded = authentication.currentAccount();
      http.expectOne('/api/auth/refresh').flush(session());
      await refresh;
      http.expectOne('/api/auth/account').flush({
        ...account,
        permissions: allowed ? ['document.render'] : [],
      });
      await reloaded;
      await vi.waitFor(() => {
        const pending = http.match({ method: 'HEAD', url: '/api/auth/account' });
        if (!allowed) {
          expect(pending).toHaveLength(0);
          expect(root.querySelector('iframe')).toBeNull();
          return;
        }
        if (pending.length > 0) {
          for (const request of pending) request.flush(null, { status: 200, statusText: 'OK' });
        }
        expect(root.querySelector('iframe')?.getAttribute('src')).toBe('/api/documents/preview');
      });
      http.expectNone('/api/auth/refresh');
      http.expectNone('/api/auth/account');
      http.verify();
      await fixture.whenStable();
    },
  );

  it('restores a missing session once before opening the protected PDF URL', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DocumentPreview);
    fixture.componentRef.setInput('url', '/api/documents/preview');
    fixture.componentRef.setInput('title', 'Document preview');
    fixture.componentRef.setInput('loadingLabel', 'Loading preview');
    fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
    const refresh = await vi.waitFor(() => http.expectOne('/api/auth/refresh'));
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    refresh.flush(session());
    (await confirmation(http)).flush(null, { status: 200, statusText: 'OK' });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('iframe')?.getAttribute('src')).toBe('/api/documents/preview');
    http.verify();
  });

  it('renews the session once when the server rejects the access cookie', async () => {
    const sessions = TestBed.inject(BrowserSessionStore);
    const http = TestBed.inject(HttpTestingController);
    sessions.set({ mode: 'administrator', expiresAt: Date.now() + 600_000 });
    const fixture = TestBed.createComponent(DocumentPreview);
    fixture.componentRef.setInput('url', '/api/documents/preview');
    fixture.componentRef.setInput('title', 'Document preview');
    fixture.componentRef.setInput('loadingLabel', 'Loading preview');
    fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
    const rejected = await confirmation(http);
    rejected.flush(
      { _tag: 'AuthenticationRequired', code: 'authentication.required' },
      { status: 401, statusText: 'Unauthorized' },
    );
    const refresh = await vi.waitFor(() => http.expectOne('/api/auth/refresh'));
    refresh.flush(session());
    (await confirmation(http)).flush(null, { status: 200, statusText: 'OK' });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('iframe')?.getAttribute('src')).toBe('/api/documents/preview');
    expect(root.querySelector('[role="alert"]')).toBeNull();
    http.verify();
  });

  it('reports an unavailable preview without exposing the document URL', async () => {
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DocumentPreview);
    fixture.componentRef.setInput('url', '/api/documents/preview');
    fixture.componentRef.setInput('title', 'Document preview');
    fixture.componentRef.setInput('loadingLabel', 'Loading preview');
    fixture.componentRef.setInput('errorLabel', 'Preview unavailable');
    const refresh = await vi.waitFor(() => http.expectOne('/api/auth/refresh'));
    refresh.flush(
      { _tag: 'SessionRejected', code: 'authentication.invalid_session' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Preview unavailable');
    expect(root.querySelector('iframe')).toBeNull();
    http.verify();
  });
});
