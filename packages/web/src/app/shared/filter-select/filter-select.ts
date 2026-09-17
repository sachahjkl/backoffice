import { _IdGenerator } from '@angular/cdk/a11y';
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CdkListbox, CdkOption, type ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { Overlay } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@froment/ui';
import { Icon } from '@shared/icon/icon';

interface FilterSelectOption {
  readonly disabled: boolean;
  readonly label: string;
  readonly value: string;
}

interface FilterSelectData {
  readonly commit: (selected: ReadonlyArray<string>) => void;
  readonly multiple: boolean;
  readonly options: ReadonlyArray<FilterSelectOption>;
  readonly selected: ReadonlyArray<string>;
}

@Component({
  selector: 'app-filter-select-dialog',
  imports: [CdkListbox, CdkOption, FormsModule, Icon],
  templateUrl: './filter-select.html',
  styleUrl: './filter-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSelectDialog {
  protected readonly data = inject<FilterSelectData>(DIALOG_DATA);
  protected readonly dialog = inject<DialogRef<ReadonlyArray<string>>>(DialogRef);
  protected readonly i18n = inject(I18nService);
  protected readonly query = signal('');
  protected readonly selected = signal(new Set(this.data.selected));
  private readonly optionControls = viewChildren<CdkOption<string>>(CdkOption);
  protected readonly options = computed(() => {
    const query = this.query().trim().toLocaleLowerCase(this.i18n.language());
    if (query === '') return this.data.options;
    return this.data.options.filter((option) =>
      option.label.toLocaleLowerCase(this.i18n.language()).includes(query),
    );
  });
  protected readonly visibleSelection = computed(() => {
    const visible = new Set(this.options().map((option) => option.value));
    return [...this.selected()].filter((value) => visible.has(value));
  });

  protected selectionChanged(event: ListboxValueChangeEvent<string>): void {
    if (!this.data.multiple) {
      this.dialog.close(event.value);
      return;
    }
    const visible = new Set(this.options().map((option) => option.value));
    const next = new Set([...this.selected()].filter((value) => !visible.has(value)));
    for (const value of event.value) next.add(value);
    this.selected.set(next);
    this.data.commit([...next]);
  }

  protected searchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const options = this.optionControls().filter((option) => !option.disabled);
    const option = event.key === 'ArrowDown' ? options[0] : options.at(-1);
    if (option === undefined) return;
    event.preventDefault();
    option.focus();
  }
}

@Directive({
  selector: 'select[appFilterSelect]',
  host: {
    class: 'filter-select',
    '[class.select]': 'true',
    'aria-haspopup': 'dialog',
    '[attr.aria-controls]': 'opened() ? dialogId : null',
    '[attr.aria-expanded]': 'opened()',
  },
})
export class FilterSelect {
  private readonly dialogs = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLSelectElement>>(ElementRef);
  private readonly i18n = inject(I18nService);
  private readonly overlay = inject(Overlay);
  protected readonly dialogId = inject(_IdGenerator).getId('filter-select-');
  protected readonly opened = signal(false);
  private active: DialogRef<ReadonlyArray<string>, FilterSelectDialog> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.active?.close());
  }

  @HostListener('mousedown', ['$event'])
  protected pointerOpen(event: MouseEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    void this.open();
  }

  @HostListener('click', ['$event'])
  protected preventNativeOpen(event: MouseEvent): void {
    event.preventDefault();
    void this.open();
  }

  @HostListener('keydown', ['$event'])
  protected keyboardOpen(event: KeyboardEvent): void {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    void this.open();
  }

  private async open(): Promise<void> {
    const select = this.element.nativeElement;
    if (select.disabled || this.active !== undefined) return;
    const options = Array.from(select.options, (option) => ({
      disabled: option.disabled,
      label: option.label.trim() || this.i18n.t('listControls.none'),
      value: option.value,
    }));
    const selected = Array.from(select.selectedOptions, (option) => option.value);
    const label = this.label(select);
    const autoFocus =
      options.length > 3
        ? '[data-filter-select-search]'
        : options.some((option) => !option.disabled)
          ? '.option:not([aria-disabled="true"])'
          : 'dialog';
    const position = this.overlay
      .position()
      .flexibleConnectedTo(select)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      ])
      .withViewportMargin(8)
      .withPush(true);
    const dialog = this.dialogs.open<ReadonlyArray<string>, FilterSelectData, FilterSelectDialog>(
      FilterSelectDialog,
      {
        id: this.dialogId,
        data: {
          commit: (values) => this.update(select, values),
          multiple: select.multiple,
          options,
          selected,
        },
        role: 'dialog',
        ariaModal: true,
        ariaLabel: label,
        autoFocus,
        restoreFocus: true,
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-transparent-backdrop',
        disableClose: false,
        disableAnimations: true,
        positionStrategy: position,
        width: `${Math.max(320, select.getBoundingClientRect().width)}px`,
        maxWidth: 'calc(100vw - 2rem)',
      },
    );
    this.active = dialog;
    this.opened.set(true);
    try {
      const result = await firstValueFrom(dialog.closed, { defaultValue: undefined });
      if (result === undefined || this.destroyRef.destroyed) return;
      this.update(select, result);
    } finally {
      this.active = undefined;
      this.opened.set(false);
    }
  }

  private update(select: HTMLSelectElement, selected: ReadonlyArray<string>): void {
    for (const option of select.options) option.selected = selected.includes(option.value);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private label(select: HTMLSelectElement): string {
    const explicit = select.getAttribute('aria-label');
    if (explicit) return explicit;
    const label = select.labels?.[0];
    if (label === undefined) return select.name;
    const copy = document.createElement('label');
    copy.append(...Array.from(label.childNodes, (node) => node.cloneNode(true)));
    copy.querySelector('select')?.remove();
    return copy.textContent?.trim() || select.name;
  }
}
