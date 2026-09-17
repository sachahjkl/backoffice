import { FilterSelect } from '@shared/filter-select/filter-select';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { disabled, form, FormField, pattern, required, submit } from '@angular/forms/signals';
import { I18nService } from '@app/i18n.service';
import { Theme } from '@app/theme';
import { Authentication } from '@backoffice/authentication';
import type { FlashModeValue } from '@froment/contracts';
import { Button } from '@shared/button/button';
import { Confirmation } from '@shared/confirmation/confirmation';
import { Notice } from '@shared/notice/notice';
import { PageHeader } from '@shared/page-header/page-header';
import { Flash } from '@shared/flash/flash';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  imports: [FilterSelect, Button, FormField, Notice, PageHeader],
  selector: 'app-account-preferences',
  styleUrl: './account-preferences.scss',
  templateUrl: './account-preferences.html',
})
export class AccountPreferences {
  protected readonly i18n = inject(I18nService);
  private readonly theme = inject(Theme);
  private readonly authentication = inject(Authentication);
  private readonly confirmation = inject(Confirmation);
  private readonly flash = inject(Flash);
  private readonly model = linkedSignal(() => ({
    theme: this.authentication.account()?.preferences.theme ?? this.theme.current(),
    language: this.authentication.account()?.preferences.language ?? this.i18n.language(),
    flashMode:
      this.authentication.account()?.preferences.flashMode ?? ('inline' satisfies FlashModeValue),
  }));
  protected readonly preferencesForm = form(this.model, (path) => {
    disabled(path, ({ state }) => state.submitting());
    required(path.theme);
    pattern(path.theme, /^(light|dark)$/);
    required(path.language);
    pattern(path.language, /^(fr|en)$/);
    required(path.flashMode);
    pattern(path.flashMode, /^(inline|toast|snack)$/);
  });
  protected readonly hasChanges = computed(() => {
    const saved = this.authentication.account()?.preferences;
    return saved !== undefined &&
      (this.model().theme !== saved.theme ||
        this.model().language !== saved.language ||
        this.model().flashMode !== saved.flashMode)
      ? true
      : false;
  });

  protected apply(event: SubmitEvent): void {
    event.preventDefault();
    if (this.preferencesForm().submitting()) return;
    if (this.preferencesForm().invalid()) {
      this.preferencesForm().markAsTouched();
      this.preferencesForm().errorSummary()[0]?.fieldTree().focusBoundControl();
      return;
    }
    void submit(this.preferencesForm, async () => {
      const saved = await this.authentication.updatePreferences(this.model());
      if (!saved) {
        this.flash.show(this.i18n.t('adminPages.preferencesError'), 'danger');
        return;
      }
      this.preferencesForm().reset();
      this.flash.show(this.i18n.t('adminPages.preferencesApplied'), 'success');
    });
  }

  async canDeactivate(): Promise<boolean> {
    if (this.preferencesForm().submitting()) return false;
    return (
      !this.hasChanges() ||
      (await this.confirmation.request(this.i18n.t('configurationWorkspace.unsaved')))
    );
  }

  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.preferencesForm().submitting() || this.hasChanges()) event.preventDefault();
  }
}
