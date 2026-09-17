import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { I18nService } from '@froment/ui';
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
  },
})
export class Notice {
  protected readonly i18n = inject(I18nService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  readonly variant = input<NoticeVariant>('info');

  protected dismiss(): void {
    const element = this.element.nativeElement;
    const parent = element.parentNode;
    if (parent) this.renderer.removeChild(parent, element);
  }
}
