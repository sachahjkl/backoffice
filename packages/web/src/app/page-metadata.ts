import { effect, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService, TranslationKey } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class PageMetadata {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly navigationEnd = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ),
    { initialValue: null },
  );

  constructor() {
    effect(() => {
      this.i18n.language();
      this.navigationEnd();
      this.updateRoute();
    });
  }

  private updateRoute(): void {
    let route = this.route.snapshot;
    while (route.firstChild) route = route.firstChild;
    this.setPageTitle(route.data['titleKey']);
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  private setPageTitle(titleKey?: TranslationKey): void {
    if (titleKey) {
      const title = this.i18n.t(titleKey).split(' | ')[0];
      this.title.setTitle(title);
    }
  }
}
