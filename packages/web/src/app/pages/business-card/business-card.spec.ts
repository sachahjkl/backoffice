import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BrandingApi } from '@backoffice/branding-api';
import { IssuerSettingsApi } from '@backoffice/issuer-settings-api';
import { BusinessCard } from './business-card';

describe('BusinessCard', () => {
  let fixture: ComponentFixture<BusinessCard>;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BusinessCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BusinessCard);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it('updates the preview from the form', () => {
    const nameInput = element.querySelector<HTMLInputElement>('input[autocomplete="name"]')!;
    nameInput.value = 'Alice Martin';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector('.identity h2')?.textContent).toContain('Alice Martin');
    const versionInput = Array.from(element.querySelectorAll<HTMLInputElement>('input')).find(
      (input) => input.closest('.version-save'),
    )!;
    expect(versionInput.value).toMatch(/^Alice Martin - /);
  });

  it('uses the configured company name and logo on a new card', async () => {
    await fixture.whenStable();
    fixture.destroy();
    const branding = TestBed.inject(BrandingApi);
    branding.current.set({ name: 'ACME', logoUrl: '/brand/acme.png', version: 0 });
    vi.spyOn(branding, 'load').mockResolvedValue();
    vi.spyOn(TestBed.inject(IssuerSettingsApi), 'get').mockRejectedValue(
      new Error('issuer.unavailable'),
    );
    fixture = TestBed.createComponent(BusinessCard);
    fixture.detectChanges();
    element = fixture.nativeElement;

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('.brand-lockup p')?.textContent).toBe('ACME');
    });
    expect(element.querySelector<HTMLImageElement>('.brand-lockup img')?.getAttribute('src')).toBe(
      '/brand/acme.png',
    );
    expect(element.querySelector('.contact-details')?.textContent).not.toContain(
      'froment.software',
    );
  });

  it('generates an editable version name and restores a local version', async () => {
    const versionInput = Array.from(element.querySelectorAll<HTMLInputElement>('input')).find(
      (input) => input.closest('.version-save'),
    )!;
    expect(versionInput.value).toMatch(/^Prénom Nom - /);

    versionInput.value = 'Carte salon';
    versionInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(element.querySelector('.version-select strong')?.textContent).toContain('Carte salon');
    expect(localStorage.getItem('froment-software.business-card.versions')).toContain(
      'Carte salon',
    );

    const nameInput = element.querySelector<HTMLInputElement>('input[autocomplete="name"]')!;
    nameInput.value = 'Nom temporaire';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.version-select')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(nameInput.value).toBe('Prénom Nom');
  });

  it('loads and deletes versions stored by an earlier component instance', () => {
    const versionInput = Array.from(element.querySelectorAll<HTMLInputElement>('input')).find(
      (input) => input.closest('.version-save'),
    )!;
    versionInput.value = 'Version locale';
    versionInput.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.destroy();

    fixture = TestBed.createComponent(BusinessCard);
    fixture.detectChanges();
    element = fixture.nativeElement;
    expect(element.querySelector('.version-select')?.textContent).toContain('Version locale');

    element
      .querySelector<HTMLButtonElement>('.version-list [appButton][data-button-variant="danger"]')!
      .click();
    fixture.detectChanges();
    expect(element.querySelector('.version-select')).toBeNull();
    expect(localStorage.getItem('froment-software.business-card.versions')).toBe('[]');
  });
});
