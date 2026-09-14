import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAccount } from '@backoffice/account.spec-helper';
import { SuppliersApi } from '@backoffice/suppliers-api';
import { Confirmation } from '@shared/confirmation/confirmation';
import { vi } from 'vitest';
import { SupplierDetail } from './supplier-detail';

const supplier = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' as const,
  displayName: 'Atelier Lumière',
  addressLine1: '12 rue des Tisserands',
  addressLine2: '',
  postalCode: '69003',
  city: 'Lyon',
  country: 'France',
  email: 'contact@atelier-lumiere.invalid',
  phone: '+33 4 72 00 00 00',
  registrationNumber: '81234567800019',
  vatNumber: 'FR12812345678',
  taxTreatment: 'france' as const,
  defaultCurrency: 'EUR',
  paymentTermsDays: 30,
  iban: 'FR7630006000011234567890189',
  bic: 'AGRIFRPP',
  archived: false,
  viesValidatedAt: null,
  updatedAt: 42,
};

async function configure() {
  const api = {
    get: vi.fn().mockResolvedValue({ success: true, result: supplier }),
    update: vi.fn().mockImplementation(async (_id, request) => ({
      success: true,
      result: { ...supplier, ...request, updatedAt: 43 },
    })),
    archive: vi.fn(),
    reactivate: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideAccount(),
      provideRouter([{ path: ':supplierId', component: SupplierDetail }]),
      { provide: SuppliersApi, useValue: api },
      { provide: Confirmation, useValue: { request: vi.fn() } },
    ],
  });
  const harness = await RouterTestingHarness.create(`/${supplier.id}`);
  await harness.fixture.whenStable();
  return { api, fixture: harness.fixture, root: harness.fixture.nativeElement as HTMLElement };
}

describe('SupplierDetail', () => {
  it('uses padded detail panels with inline-editable fields', async () => {
    const { root } = await configure();

    expect(root.querySelectorAll('app-detail-panel')).toHaveLength(3);
    expect(root.querySelectorAll('[appInlineEdit]')).toHaveLength(15);
    expect(root.querySelector('[pageActions] a')).toBeNull();
  });

  it('updates one field from its inline editor', async () => {
    const { api, fixture, root } = await configure();
    const field = root.querySelector<HTMLElement>('[appInlineEdit]')!;

    field.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    const input = field.querySelector<HTMLInputElement>('input')!;
    input.value = 'Atelier Lumière Rhône';
    input.dispatchEvent(new Event('input'));
    field.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(api.update).toHaveBeenCalledWith(
      supplier.id,
      expect.objectContaining({ displayName: 'Atelier Lumière Rhône', expectedUpdatedAt: 42 }),
    );
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Atelier Lumière Rhône');
  });
});
