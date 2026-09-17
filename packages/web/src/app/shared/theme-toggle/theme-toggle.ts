import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@froment/ui';
import { Theme } from '@froment/ui';
@Component({
  selector: 'app-theme-toggle',
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(Theme);
}
