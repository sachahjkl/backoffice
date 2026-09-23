import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrandingApi } from './branding-api';

describe('BrandingApi', () => {
  it('loads public branding and updates the shared presentation', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(BrandingApi);
    const http = TestBed.inject(HttpTestingController);
    const load = api.load();
    http.expectOne('/api/branding').flush({ name: 'Example', logoUrl: '/logo.png', version: 0 });
    await load;
    expect(api.current()?.name).toBe('Example');

    const update = api.update({ name: 'New name', logoUrl: null, expectedVersion: 0 });
    const request = http.expectOne('/api/branding');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ name: 'New name', logoUrl: null, expectedVersion: 0 });
    request.flush({ name: 'New name', logoUrl: '/logo.png', version: 1 });
    await expect(update).resolves.toMatchObject({ success: true });
    expect(api.current()?.name).toBe('New name');
    http.verify();
  });
});
