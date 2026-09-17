import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';
import type { ButtonVariant } from '@shared/button/button';
import type { ButtonSize } from '@shared/button/button';
import { Hint } from '@shared/hint/hint';

export type SegmentedControlVariant = Exclude<ButtonVariant, 'link'>;

export interface SegmentedControlOption<Value extends string = string> {
  readonly value: Value;
  readonly label: string;
  readonly variant?: SegmentedControlVariant;
  readonly hint?: string;
  readonly hintContent?: TemplateRef<unknown>;
}

@Component({
  selector: 'app-segmented-control',
  imports: [Hint],
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-segmented-variant]': 'variant()',
    '[attr.data-segmented-size]': 'size()',
  },
})
export class SegmentedControl<Value extends string = string> {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<ReadonlyArray<SegmentedControlOption<Value>>>();
  readonly value = input.required<Value>();
  readonly disabled = input(false);
  readonly variant = input<SegmentedControlVariant>('primary');
  readonly size = input<ButtonSize>('default');
  readonly valueChange = output<Value>();

  protected select(value: Value): void {
    if (!this.disabled() && value !== this.value()) this.valueChange.emit(value);
  }
}
