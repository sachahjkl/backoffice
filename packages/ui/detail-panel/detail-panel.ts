import { _IdGenerator } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

@Component({
  selector: 'app-detail-panel',
  template: `
    <section class="ds-panel" [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId">{{ heading() }}</h2>
      <ng-content />
    </section>
  `,
  styleUrl: './detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPanel {
  readonly heading = input.required<string>();
  protected readonly headingId = inject(_IdGenerator).getId('detail-panel-');
}

@Component({
  selector: 'dl[appDetailList]',
  template: '<ng-content />',
  styles: `
    :host {
      display: grid;
      gap: var(--space-4);
      min-inline-size: 0;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailList {}

@Component({
  selector: '[appDetailGrid]',
  template: '<ng-content />',
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
      gap: var(--space-6);
      min-inline-size: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailGrid {}
