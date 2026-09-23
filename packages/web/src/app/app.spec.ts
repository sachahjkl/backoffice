import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App shell', () => {
  it('opens the login page from the root and keeps the skip target available', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter(routes)],
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(router.url).toBe('/login');
    expect(element.querySelector('.skip-link')?.getAttribute('href')).toBe('#main-content');
    expect(element.querySelector('main#main-content')?.getAttribute('tabindex')).toBe('-1');
    expect(element.querySelector('app-site-header, app-site-footer')).toBeNull();
    expect(element.querySelector('app-login')).not.toBeNull();
  });

  it('uses the standalone shell for the version page', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter(routes)],
    });
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/version');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.app-shell')?.classList).toContain('standalone-shell');
    expect(element.querySelector('main#main-content app-version')).not.toBeNull();
  });
});
