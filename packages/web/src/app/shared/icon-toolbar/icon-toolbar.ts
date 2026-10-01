import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Hint } from '@shared/hint/hint';
import { Icon, type IconName } from '@shared/icon/icon';

export interface IconToolbarItem<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly icon: IconName;
  readonly pressed: boolean | null;
  readonly disabled: boolean;
}

export interface IconToolbarGroup<Value extends string> {
  readonly label: string;
  readonly items: ReadonlyArray<IconToolbarItem<Value>>;
}

@Component({
  imports: [Toolbar, ToolbarWidget, Hint, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-icon-toolbar',
  styleUrl: './icon-toolbar.scss',
  templateUrl: './icon-toolbar.html',
})
export class IconToolbar<Value extends string> {
  readonly label = input.required<string>();
  readonly groups = input.required<ReadonlyArray<IconToolbarGroup<Value>>>();
  readonly disabled = input(false);
  readonly activated = output<Value>();
  protected activate(item: IconToolbarItem<Value>): void {
    if (this.disabled() || item.disabled) return;
    this.activated.emit(item.value);
  }
}
