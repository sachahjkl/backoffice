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
  private readonly http = inject(HttpClient);
  readonly current = signal<Branding | null>(null);

  async load(): Promise<void> {
    try {
      this.current.set(
        Schema.decodeUnknownSync(Branding)(
          await firstValueFrom(this.http.get<unknown>('/api/branding')),
        ),
      );
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
    if (outcome.success) this.current.set(outcome.result);
    return outcome;
  }
}
