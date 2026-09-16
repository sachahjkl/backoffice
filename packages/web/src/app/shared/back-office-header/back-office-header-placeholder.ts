import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NavigationProgress } from '@shared/navigation-progress/navigation-progress';

@Component({
  imports: [NavigationProgress],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-back-office-header-placeholder',
  styleUrl: './back-office-header-placeholder.scss',
  templateUrl: './back-office-header-placeholder.html',
})
export class BackOfficeHeaderPlaceholder {
  readonly administrator = input(false);
}
