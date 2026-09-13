import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'span[appBadge]',
  template: '<ng-content />',
  styleUrl: './badge.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'badge',
    '[class.ok]': "variant() === 'success'",
    '[class.warn]': "variant() === 'warning'",
    '[class.err]': "variant() === 'danger'",
  },
})
export class Badge {
  readonly variant = input<BadgeVariant>('default');
}
