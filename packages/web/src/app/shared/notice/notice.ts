import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { I18nService } from '@app/i18n.service';
import { Icon } from '@shared/icon/icon';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'p[appNotice], div[appNotice]',
  imports: [Icon],
  template: `<ng-content /><button
      class="notice-dismiss"
      type="button"
      [attr.aria-label]="i18n.t('notice.dismiss')"
      (click)="dismiss()"
    >
      <app-icon name="close" />
    </button>`,
  styleUrl: './notice.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'notice',
    '[class.success]': "variant() === 'success'",
    '[class.warning]': "variant() === 'warning'",
    '[class.danger]': "variant() === 'danger'",
    '[hidden]': 'dismissed()',
  },
})
export class Notice {
  protected readonly i18n = inject(I18nService);
  protected readonly dismissed = signal(false);
  readonly variant = input<NoticeVariant>('info');

  protected dismiss(): void {
    this.dismissed.set(true);
  }
}
