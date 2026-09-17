import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { FlashModeValue } from '@froment/contracts';
import { Icon } from '@shared/icon/icon';
import { I18nService } from '@froment/ui';
import { Flash, type FlashMessage } from './flash';

@Component({
  selector: 'app-flash-outlet',
  imports: [Icon],
  templateUrl: './flash-outlet.html',
  styleUrl: './flash-outlet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-flash-mode]': 'displayMode()' },
})
export class FlashOutlet {
  protected readonly flash = inject(Flash);
  protected readonly i18n = inject(I18nService);
  readonly mode = input<FlashModeValue>();
  protected readonly displayMode = computed(() => this.mode() ?? this.flash.mode());
  private readonly drag = signal<{ readonly id: string; readonly startX: number } | undefined>(
    undefined,
  );

  protected role(message: FlashMessage): 'alert' | 'status' {
    return message.variant === 'danger' || message.variant === 'warning' ? 'alert' : 'status';
  }

  protected dragStart(event: PointerEvent, message: FlashMessage): void {
    if (event.pointerType === 'mouse') return;
    if (!(event.currentTarget instanceof HTMLElement)) return;
    this.flash.pause(message.id);
    this.drag.set({ id: message.id, startX: event.clientX });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  protected dragMove(event: PointerEvent, message: FlashMessage): void {
    const drag = this.drag();
    if (drag?.id !== message.id) return;
    if (!(event.currentTarget instanceof HTMLElement)) return;
    event.currentTarget.style.setProperty('--flash-drag', `${event.clientX - drag.startX}px`);
  }

  protected dragEnd(event: PointerEvent, message: FlashMessage): void {
    const drag = this.drag();
    if (drag?.id !== message.id) return;
    if (!(event.currentTarget instanceof HTMLElement)) return;
    this.drag.set(undefined);
    const distance = event.clientX - drag.startX;
    event.currentTarget.style.removeProperty('--flash-drag');
    if (Math.abs(distance) >= 64) {
      this.flash.dismiss(message.id);
      return;
    }
    this.resumeIfIdle(event.currentTarget, message, false);
  }

  protected pause(message: FlashMessage): void {
    this.flash.pause(message.id);
  }

  protected resume(event: Event, message: FlashMessage): void {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    this.resumeIfIdle(event.currentTarget, message, true);
  }

  protected dragging(message: FlashMessage): boolean {
    return this.drag()?.id === message.id;
  }

  private resumeIfIdle(element: HTMLElement, message: FlashMessage, checkHover: boolean): void {
    if (this.dragging(message)) return;
    if (checkHover && element.matches(':hover')) return;
    if (element.contains(element.ownerDocument.activeElement)) return;
    this.flash.resume(message.id);
  }
}
