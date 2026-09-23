import { Can } from '@backoffice/can';
import { BrandingApi } from '@backoffice/branding-api';
import { DemoApi } from '@backoffice/demo-api';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '@app/i18n.service';
import { RuntimeConfiguration } from '@app/runtime-configuration';
import { Button } from '@shared/button/button';
import { Confirmation } from '@shared/confirmation/confirmation';
import { Notice } from '@shared/notice/notice';

@Component({
  imports: [Button, Can, Notice, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-configuration-index',
  styleUrl: './configuration-index.scss',
  templateUrl: './configuration-index.html',
})
export class ConfigurationIndex {
  protected readonly branding = inject(BrandingApi);
  protected readonly brandingSaving = signal(false);
  protected readonly brandingError = signal(false);
  protected readonly brandingSaved = signal(false);

  constructor() {
    void this.branding.load();
  }

  protected async saveBranding(event: SubmitEvent, name: string, logo: File | null): Promise<void> {
    event.preventDefault();
    const current = this.branding.current();
    if (!current || this.brandingSaving()) return;
    this.brandingSaving.set(true);
    this.brandingError.set(false);
    this.brandingSaved.set(false);
    try {
      if (
        logo &&
        (logo.size > 256 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(logo.type))
      ) {
        this.brandingError.set(true);
        return;
      }
      const logoUrl = logo ? await this.readLogo(logo) : current.logoUrl;
      const outcome = await this.branding.update({
        name: name.trim(),
        logoUrl,
        expectedVersion: current.version,
      });
      this.brandingError.set(!outcome.success);
      this.brandingSaved.set(outcome.success);
    } catch {
      this.brandingError.set(true);
    } finally {
      this.brandingSaving.set(false);
    }
  }

  private readLogo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  protected async resetBranding(): Promise<void> {
    const current = this.branding.current();
    if (!current || this.brandingSaving()) return;
    this.brandingSaving.set(true);
    this.brandingError.set(false);
    this.brandingSaved.set(false);
    const outcome = await this.branding.update({
      name: null,
      logoUrl: null,
      expectedVersion: current.version,
    });
    this.brandingSaving.set(false);
    this.brandingError.set(!outcome.success);
    this.brandingSaved.set(outcome.success);
  }
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(DemoApi);
  private readonly confirmation = inject(Confirmation);
  private readonly router = inject(Router);
  private readonly runtime = inject(RuntimeConfiguration);
  protected readonly demoAvailable =
    this.runtime.value?.appEnvironment !== undefined &&
    this.runtime.value.appEnvironment !== 'production';
  protected readonly resetting = signal(false);
  protected readonly resetError = signal(false);

  protected async resetDemo(): Promise<void> {
    const password = await this.confirmation.requestSecret(
      this.i18n.t('demo.confirm'),
      this.i18n.t('demo.password'),
      { acceptLabel: this.i18n.t('demo.reset'), variant: 'danger' },
    );
    if (password === undefined) return;
    this.resetting.set(true);
    this.resetError.set(false);
    const result = await this.api.reset(password);
    this.resetting.set(false);
    if (!result.success) {
      this.resetError.set(true);
      return;
    }
    await this.router.navigate(['/login'], { queryParams: { demoReset: 'true' } });
  }
}
