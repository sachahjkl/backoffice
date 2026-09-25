import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, UrlSerializer } from '@angular/router';
import { type LoginModeValue } from '@froment/contracts';
import { Authentication } from '@backoffice/authentication';
import { BrandingApi } from '@backoffice/branding-api';
import { I18nService, TranslationKey } from '@app/i18n.service';
import { Button } from '@shared/button/button';
import { Notice } from '@shared/notice/notice';
import { Passkeys } from '@backoffice/passkeys';
import { loginDestination } from './login-navigation';
import { RuntimeConfiguration } from '@app/runtime-configuration';

@Component({
  host: { class: 'page-container' },
  selector: 'app-login',
  imports: [Button, Notice, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly branding = inject(BrandingApi);
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(Authentication);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runtime = inject(RuntimeConfiguration);
  private readonly urlSerializer = inject(UrlSerializer);
  protected readonly error = signal<TranslationKey | undefined>(undefined);
  protected readonly pending = signal(false);
  protected readonly passkeys = inject(Passkeys);
  protected readonly demo = this.runtime.value?.demo;
  protected readonly selectedIdentity = signal('');
  protected readonly currentYear = new Date().getUTCFullYear();
  protected readonly brandName = computed(
    () => this.branding.current()?.name ?? this.i18n.t('backOffice.title'),
  );
  protected readonly brandLogoUrl = computed(
    () => this.branding.current()?.logoUrl ?? '/brand/default.svg',
  );
  protected readonly source = computed(() => {
    const commit = this.runtime.value?.commit;
    const url = this.runtime.commitUrl(commit);
    return commit && url ? { commit: commit.slice(0, 8), url } : undefined;
  });

  constructor() {
    void this.branding.load();
  }

  protected async loginPasskey(): Promise<void> {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(undefined);
    const outcome = await this.auth.authenticatePasskey(() => this.passkeys.assertion());
    this.pending.set(false);
    if (outcome.success) await this.router.navigateByUrl(this.destination(outcome.mode));
    else this.error.set(outcome.code);
  }

  protected readonly submitLabel = computed<TranslationKey>(() => {
    if (this.pending()) return 'backOffice.pending';
    return 'backOffice.submit';
  });

  protected selectIdentity(
    email: string,
    emailInput: HTMLInputElement,
    passwordInput: HTMLInputElement,
  ): void {
    const account = this.demo?.accounts.find((candidate) => candidate.email === email);
    if (!account || !this.demo) {
      this.selectedIdentity.set('');
      return;
    }
    this.selectedIdentity.set(account.email);
    emailInput.value = account.email;
    passwordInput.value = this.demo.password;
  }

  async submit(event: SubmitEvent, email: string, password: string): Promise<void> {
    event.preventDefault();
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(undefined);

    const outcome = await this.auth.authenticate(email, password);
    this.pending.set(false);
    if (outcome.success) {
      await this.router.navigateByUrl(this.destination(outcome.mode));
      return;
    }

    this.error.set(outcome.code);
  }

  private destination(mode: LoginModeValue): string {
    return loginDestination(
      mode,
      this.route.snapshot.queryParamMap.get('returnUrl'),
      this.urlSerializer,
    );
  }
}
