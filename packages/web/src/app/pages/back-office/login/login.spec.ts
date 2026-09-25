import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Authentication } from '@backoffice/authentication';
import { RuntimeConfiguration } from '@app/runtime-configuration';
import { Login } from './login';

class AuthStub {
  readonly calls: Array<readonly [string, string]> = [];

  constructor(private readonly mode: 'client' | 'administrator') {}

  authenticate(
    email: string,
    password: string,
  ): Promise<{ success: true; mode: 'client' | 'administrator' }> {
    this.calls.push([email, password]);
    return Promise.resolve({ success: true, mode: this.mode });
  }
}

describe('Login', () => {
  it('fills the form from the selected demo identity', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Login }]),
        { provide: Authentication, useValue: new AuthStub('administrator') },
        {
          provide: RuntimeConfiguration,
          useValue: {
            value: {
              appEnvironment: 'development',
              sitePhase: 'live',
              commit: '6c9757782e249d4db6ffb804349b7da620494565',
              githubRepositoryUrl: 'https://github.com/example/backoffice',
              demo: {
                password: 'public-demo-password',
                accounts: [{ name: 'Léa Morel', email: 'administrator@demo.invalid' }],
              },
            },
            commitUrl: (commit: string | null | undefined) =>
              commit ? `https://github.com/example/backoffice/commit/${commit}` : undefined,
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create('/');
    const root: HTMLElement = harness.fixture.nativeElement;
    const identity = root.querySelector<HTMLSelectElement>('#login-identity');
    const email = root.querySelector<HTMLInputElement>('#back-office-email');
    const password = root.querySelector<HTMLInputElement>('#back-office-password');

    expect(identity).not.toBeNull();
    expect(identity?.options).toHaveLength(2);
    expect(root.querySelector('.demo-accounts')).toBeNull();
    expect(root.textContent).not.toContain('public-demo-password');
    expect(root.querySelector<HTMLAnchorElement>('.login-footer a')?.getAttribute('href')).toBe(
      'https://github.com/example/backoffice/commit/6c9757782e249d4db6ffb804349b7da620494565',
    );

    identity!.value = 'administrator@demo.invalid';
    identity!.dispatchEvent(new Event('change'));

    expect(email?.value).toBe('administrator@demo.invalid');
    expect(password?.value).toBe('public-demo-password');
  });

  it('redirects an administrator from the single login form', async () => {
    const auth = new AuthStub('administrator');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Login }]),
        { provide: Authentication, useValue: auth },
      ],
    });
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create('/');
    const fixture = harness.fixture;
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.eyebrow')).toBeNull();
    expect(root.querySelector('.ds-panel')).toBeNull();
    expect(root.querySelector('.login-intro')).not.toBeNull();
    expect(root.querySelector('.login-description')?.textContent).toContain('email');
    expect(root.querySelector('.identity-picker')).toBeNull();
    expect(root.querySelector('.login-footer')).not.toBeNull();
    expect(root.querySelector('form')?.getAttribute('aria-labelledby')).toBe('login-form-title');
    expect(root.querySelector('form')?.getAttribute('aria-describedby')).toBe('login-description');
    expect(root.querySelector('h1')?.textContent).toContain('Back office');
    const bootstrapLink = () => root.querySelector<HTMLAnchorElement>('.bootstrap-link');
    expect(root.querySelector('.bootstrap-slot')).not.toBeNull();
    expect(bootstrapLink()?.hasAttribute('appLinkButton')).toBe(false);
    expect(bootstrapLink()?.getAttribute('href')).toBe('/bootstrap');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const inputs = root.querySelectorAll<HTMLInputElement>('input');
    const [email, password] = inputs;
    if (email === undefined || password === undefined) throw new Error('Login fields are missing.');
    email.value = 'administrator@example.test';
    password.value = 'administrator-password';
    root.querySelector<HTMLFormElement>('form')?.dispatchEvent(new SubmitEvent('submit'));
    await fixture.whenStable();

    expect(auth.calls).toEqual([['administrator@example.test', 'administrator-password']]);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('returns a client to the requested portal document', async () => {
    const auth = new AuthStub('client');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Login }]),
        { provide: Authentication, useValue: auth },
      ],
    });
    const router = TestBed.inject(Router);
    const target = '/client/documents/quote/01ARZ3NDEKTSV4RRFFQ69G5FAV';
    const harness = await RouterTestingHarness.create(`/?returnUrl=${encodeURIComponent(target)}`);
    const root: HTMLElement = harness.fixture.nativeElement;
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const inputs = root.querySelectorAll<HTMLInputElement>('input');
    const [email, password] = inputs;
    if (email === undefined || password === undefined) throw new Error('Login fields are missing.');
    email.value = 'client@example.test';
    password.value = 'client-password';

    root.querySelector<HTMLFormElement>('form')?.dispatchEvent(new SubmitEvent('submit'));
    await harness.fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(target);
  });
});
