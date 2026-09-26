import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  Branding,
  BrandingConflict,
  type BrandingUpdateRequest,
} from '../../../../contracts/src/company/branding';
import { firstValueFrom } from 'rxjs';
import { Schema } from 'effect';

import { requestOutcome } from '@shared/api-outcome';

@Injectable({ providedIn: 'root' })
export class BrandingApi {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  readonly current = signal<Branding | null>(null);

  async load(): Promise<void> {
    try {
      const branding = Schema.decodeUnknownSync(Branding)(
        await firstValueFrom(this.http.get<unknown>('/api/branding')),
      );
      this.current.set(branding);
      this.updateFavicon(branding.logoUrl);
    } catch {
      this.current.set(null);
    }
  }

  async update(request: BrandingUpdateRequest) {
    const outcome = await requestOutcome(
      this.http.put<unknown>('/api/branding', request),
      Branding,
      BrandingConflict,
      'company.error',
    );
    if (outcome.success) {
      this.current.set(outcome.result);
      this.updateFavicon(outcome.result.logoUrl);
    }
    return outcome;
  }

  private updateFavicon(logoUrl: string): void {
    const icon =
      this.document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]') ??
      this.document.createElement('link');
    icon.rel = 'icon';
    icon.href = logoUrl;
    if (!icon.parentNode) this.document.head.append(icon);

    const appleTouchIcon = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="apple-touch-icon"]',
    );
    if (appleTouchIcon) appleTouchIcon.href = logoUrl;
  }
}
