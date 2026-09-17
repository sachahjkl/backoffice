import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '@froment/ui/icon';
export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark'
  | 'ghost'
  | 'link';
export type ButtonSize = 'small' | 'default' | 'large';

@Component({
  selector: 'button[appButton], a[appLinkButton]',
  imports: [Icon],
  template: `
    @if (iconPosition() === 'start') {
      @if (icon(); as name) {
        <app-icon [name]="name" />
      }
    }
    <ng-content />
    @if (iconPosition() === 'end') {
      @if (icon(); as name) {
        <app-icon [name]="name" />
      }
    }
  `,
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-button-variant]': 'variant()',
    '[attr.data-button-size]': 'size()',
    '[attr.data-button-icon-only]': "iconOnly() ? '' : null",
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('default');
  readonly iconOnly = input(false);
  readonly icon = input<IconName>();
  readonly iconPosition = input<'start' | 'end'>('start');
}
