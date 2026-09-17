import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { disabled, email, form, FormField, required, submit } from '@angular/forms/signals';
import { Button } from '@shared/button/button';
import { ListSearch } from '@shared/list-search/list-search';
import { FilterMenu, FilterPanel } from '@shared/filter-menu/filter-menu';
import { FilterChoice, type FilterChoiceOption } from '@shared/filter-choice/filter-choice';
import { DateRangeFilter, type DateRange } from '@shared/date-range-filter/date-range-filter';
import { ObjectPicker } from '@shared/object-picker/object-picker';
import { FieldGroup } from '@froment/ui/field-group';
import { FieldHint } from '@froment/ui/field-hint';
import { FilterSelect } from '@shared/filter-select/filter-select';
import { InlineEdit } from '@shared/inline-edit/inline-edit';
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '@shared/segmented-control/segmented-control';
import type { ButtonSize } from '@shared/button/button';
import { StoryPage, currentReference, type StoryDefinition } from '../story-page';
import { referenceText } from '../reference-text';

interface FieldPreview {
  label: string;
  description: string;
  value: string;
  placeholder: string;
  choice: string;
  optionLabel: string;
  disabled: boolean;
  empty: boolean;
  from: string;
  to: string;
}

@Component({
  selector: 'app-field-stories',
  imports: [
    StoryPage,
    FormField,
    Button,
    ListSearch,
    FilterMenu,
    FilterPanel,
    FilterChoice,
    DateRangeFilter,
    ObjectPicker,
    FieldGroup,
    FieldHint,
    FilterSelect,
    InlineEdit,
    SegmentedControl,
  ],
  templateUrl: './field-stories.html',
  styleUrl: './story.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldStories {
  protected readonly entry = currentReference();
  protected readonly text = referenceText();
  protected get definition(): StoryDefinition {
    return this.text().stories[this.entry.id];
  }
  protected readonly model = signal<FieldPreview>({
    label: this.text().content,
    description: this.text().local,
    value: '',
    placeholder: this.text().examples.firstName,
    choice: 'all',
    optionLabel: this.text().draft,
    disabled: false,
    empty: false,
    from: this.text().examples.from,
    to: this.text().examples.to,
  });
  protected readonly controls = form(this.model, (path) => {
    disabled(path.value, () => this.model().disabled);
    disabled(path.choice, () => this.model().disabled);
  });
  protected readonly emailValue = signal('');
  protected readonly emailField = form(this.emailValue, (path) => {
    required(path);
    email(path);
    disabled(path, () => this.model().disabled);
  });
  protected readonly event = signal('');
  protected readonly segment = signal('plain');
  private readonly segmentHint = viewChild.required<TemplateRef<unknown>>('segmentHint');
  protected readonly segmentOptions = computed<ReadonlyArray<SegmentedControlOption>>(() => [
    {
      value: 'plain',
      label: this.text().plain,
      variant: 'default',
      hint: this.text().description,
    },
    {
      value: 'blocks',
      label: this.text().formatted,
      variant: 'default',
      hintContent: this.segmentHint(),
    },
    {
      value: 'preview',
      label: this.text().preview,
      variant: 'info',
    },
    {
      value: 'remove',
      label: this.text().remove,
      variant: 'danger',
    },
  ]);
  protected readonly segmentSamples: ReadonlyArray<{
    readonly size: ButtonSize;
    readonly disabled: boolean;
  }> = [
    { size: 'small', disabled: false },
    { size: 'default', disabled: false },
    { size: 'large', disabled: false },
    { size: 'default', disabled: true },
  ];
  protected readonly inlineEditing = signal(false);
  protected readonly inlineValue = signal(this.text().examples.firstName);
  protected readonly options = computed<readonly FilterChoiceOption[]>(() =>
    this.model().empty
      ? []
      : [
          { value: 'all', label: this.text().all, count: 6 },
          { value: 'draft', label: this.model().optionLabel, count: 3 },
          { value: 'ready', label: this.text().ready, count: 3 },
        ],
  );
  protected readonly selectedLabel = computed(
    () =>
      this.options().find((option) => option.value === this.model().choice)?.label ??
      this.text().none,
  );
  protected readonly pickerOptions = computed(() => [
    { id: 'angular', label: this.model().optionLabel, detail: this.text().examples.channel },
    {
      id: 'typescript',
      label: this.text().examples.technology,
      detail: this.text().examples.channel,
    },
  ]);
  protected readonly range = signal<DateRange>({
    from: this.text().examples.from,
    to: this.text().examples.to,
  });
  protected readonly rangeRevision = signal(0);
  protected readonly rangeSamples: readonly DateRange[] = [
    {},
    { from: this.text().examples.from, to: this.text().examples.to },
    { from: this.text().examples.to, to: this.text().examples.from },
  ];
  protected readonly sampleFields = form(
    signal({
      text: this.text().examples.firstName,
      email: this.text().examples.email,
      number: 3,
      date: this.text().examples.date,
      search: '',
      checked: true,
      select: 'draft',
      note: this.text().content,
    }),
  );
  private readonly injector = inject(Injector);
  protected applyRangeInputs(): void {
    this.range.set({ from: this.model().from || undefined, to: this.model().to || undefined });
    this.rangeRevision.update((value) => value + 1);
  }
  protected rangeApplied(value: DateRange): void {
    this.event.set(JSON.stringify(value));
  }
  protected validate(event: SubmitEvent): void {
    event.preventDefault();
    void submit(this.emailField, {
      action: async () => {
        this.event.set(this.emailValue());
      },
      onInvalid: () => {
        afterNextRender(() => this.emailField().focusBoundControl(), { injector: this.injector });
      },
    });
  }
  protected saveInline(value: string): void {
    this.inlineValue.set(value);
    this.inlineEditing.set(false);
    this.event.set(value);
  }
}
