import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { I18nService } from './i18n.service';
import { PageMetadata } from './page-metadata';

@Component({ template: '' })
class MetadataPage {}

describe('PageMetadata', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MetadataPage, data: { titleKey: 'page.back_office' } },
          { path: 'quote', component: MetadataPage, data: { titleKey: 'page.public_quote' } },
          {
            path: 'account',
            component: MetadataPage,
            children: [
              {
                path: 'security',
                component: MetadataPage,
                data: { titleKey: 'account.security_title' },
              },
            ],
          },
        ]),
      ],
    });
    TestBed.inject(I18nService).setLanguage('fr');
    TestBed.inject(PageMetadata);
  });

  it('sets the route title and blocks indexing on navigation', async () => {
    const i18n = TestBed.inject(I18nService);
    const harness = await RouterTestingHarness.create('/login');
    await harness.fixture.whenStable();
    expect(document.title).toBe(i18n.t('page.back_office').split(' | ')[0]);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    await harness.navigateByUrl('/quote');
    await harness.fixture.whenStable();
    expect(document.title).toBe(i18n.t('page.public_quote').split(' | ')[0]);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });

  it('uses the deepest route title and updates it when the language changes', async () => {
    const i18n = TestBed.inject(I18nService);
    const harness = await RouterTestingHarness.create('/account/security');
    await harness.fixture.whenStable();
    expect(document.title).toBe(i18n.t('account.security_title').split(' | ')[0]);

    i18n.setLanguage('en');
    await harness.fixture.whenStable();
    expect(document.title).toBe(i18n.t('account.security_title').split(' | ')[0]);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });
});
