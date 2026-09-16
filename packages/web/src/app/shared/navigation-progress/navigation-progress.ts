import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@app/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-navigation-progress',
  styleUrl: './navigation-progress.scss',
  templateUrl: './navigation-progress.html',
})
export class NavigationProgress {
  protected readonly navigation = inject(Router).currentNavigation;
  protected readonly i18n = inject(I18nService);
}
