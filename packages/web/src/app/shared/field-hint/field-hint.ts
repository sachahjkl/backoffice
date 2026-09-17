import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'small[appFieldHint], p[appFieldHint], span[appFieldHint]',
  template: '<ng-content />',
  styleUrl: './field-hint.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldHint {}
