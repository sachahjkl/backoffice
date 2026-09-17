import { FilterSelect } from '@shared/filter-select/filter-select';
import { _IdGenerator } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { I18nService } from '@froment/ui';
import { Button } from '@shared/button/button';
import { Hint } from '@froment/ui/hint';
import { Icon } from '@froment/ui/icon';
export interface InlineEditOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'div[appInlineEdit]',
  imports: [FilterSelect, Button, Hint, Icon],
  styleUrl: './inline-edit.scss',
  templateUrl: './inline-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[class.is-disabled]': 'disabled()',
  },
})
export class InlineEdit {
  protected readonly i18n = inject(I18nService);
  protected readonly controlId = inject(_IdGenerator).getId('inline-edit-');
  protected readonly labelId = `${this.controlId}-label`;
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly displayValue = input<string>();
  readonly emptyValue = input.required<string>();
  readonly editable = input(true);
  readonly disabled = input(false);
  readonly editing = input(false);
  readonly saving = input(false);
  readonly required = input(false);
  readonly inputType = input<'text' | 'email' | 'tel'>('text');
  readonly maximumLength = input<number>();
  readonly options = input<ReadonlyArray<InlineEditOption>>([]);
  readonly editRequested = output<void>();
  readonly cancelRequested = output<void>();
  readonly saveRequested = output<string>();
  protected readonly draft = linkedSignal(() => this.value());

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.disabled()) return;
    const value = this.draft().trim();
    if (this.required() && value === '') return;
    this.saveRequested.emit(value);
  }
}
