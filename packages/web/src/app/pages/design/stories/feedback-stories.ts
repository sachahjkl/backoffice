import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Badge, type BadgeVariant } from '@shared/badge/badge';
import { Notice, type NoticeVariant } from '@shared/notice/notice';
import { EmptyState } from '@shared/empty-state/empty-state';
import { Hint } from '@shared/hint/hint';
import { StatusBlock, type StatusBlockVariant } from '@shared/status-block/status-block';
import { Icon, type IconName } from '@shared/icon/icon';
import { EntityIcon } from '@shared/entity-icon/entity-icon';
import { Button } from '@shared/button/button';
import { Flash, type FlashVariant } from '@shared/flash/flash';
import { FlashOutlet } from '@shared/flash/flash-outlet';
import type { FlashModeValue } from '@froment/contracts';
import { StoryPage, currentReference, type StoryDefinition } from '../story-page';
import { referenceText } from '../reference-text';

interface FeedbackPreview {
  label: string;
  description: string;
  icon: IconName;
  badge: BadgeVariant;
  notice: NoticeVariant;
  flashMode: FlashModeValue;
  status: StatusBlockVariant;
  entity: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

export const iconNames: readonly IconName[] = [
  'ai',
  'build',
  'calendar',
  'ci',
  'development',
  'environment',
  'external',
  'infrastructure',
  'mail',
  'metrics',
  'secrets',
  'tests',
  'upgrade',
  'dashboard',
  'clients',
  'folder',
  'invoice',
  'bank',
  'settings',
  'catalog',
  'book',
  'menu',
  'more',
  'close',
  'chevron',
  'user',
  'logout',
  'plus',
  'search',
  'check',
  'arrow-left',
  'chevron-right',
  'download',
  'filter',
  'rss',
  'paragraph',
  'heading-2',
  'heading-3',
  'bold',
  'italic',
  'list-bullets',
  'list-numbers',
  'undo',
  'redo',
];
@Component({
  selector: 'app-feedback-stories',
  imports: [
    StoryPage,
    FormField,
    Badge,
    Notice,
    EmptyState,
    Hint,
    StatusBlock,
    Icon,
    EntityIcon,
    Button,
    FlashOutlet,
  ],
  providers: [Flash],
  templateUrl: './feedback-stories.html',
  styleUrl: './story.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackStories {
  private readonly flash = inject(Flash);
  protected readonly entry = currentReference();
  protected readonly text = referenceText();
  protected get definition(): StoryDefinition {
    return this.text().stories[this.entry.id];
  }
  protected readonly icons = iconNames;
  protected readonly badges: readonly BadgeVariant[] = ['default', 'success', 'warning', 'danger'];
  protected readonly notices: readonly NoticeVariant[] = ['info', 'success', 'warning', 'danger'];
  protected readonly flashModes: readonly FlashModeValue[] = ['inline', 'toast', 'snack'];
  protected readonly flashVariants: readonly FlashVariant[] = [
    'info',
    'success',
    'warning',
    'danger',
  ];
  protected readonly statuses: readonly StatusBlockVariant[] = ['primary', 'success', 'danger'];
  protected readonly entityVariants = ['default', 'info', 'success', 'warning', 'danger'] as const;
  protected readonly model = signal<FeedbackPreview>({
    label: this.text().content,
    description: this.text().local,
    icon: 'folder',
    badge: 'default',
    notice: 'info',
    flashMode: 'inline',
    status: 'primary',
    entity: 'info',
  });
  protected readonly controls = form(this.model);
  protected readonly event = signal('');

  protected showFlash(variant: FlashVariant): void {
    this.flash.show(this.model().label, variant);
  }

  protected setFlashMode(flashMode: FlashModeValue): void {
    this.model.update((value) => ({ ...value, flashMode }));
  }
}
