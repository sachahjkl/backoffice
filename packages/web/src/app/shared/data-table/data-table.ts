import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { I18nService } from '@app/i18n.service';

@Component({
  selector: 'div[appDataTable]',
  template: '<ng-content />',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'data-table',
    '[attr.data-table-layout]': 'tableLayout()',
    role: 'region',
    tabindex: '0',
    '[attr.aria-label]': "i18n.t('table.scrollRegion')",
  },
})
export class DataTable {
  readonly tableLayout = input<'scroll' | 'fluid'>('scroll');
  protected readonly i18n = inject(I18nService);
}
