import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Authentication } from '@backoffice/authentication';

export type FlashVariant = 'info' | 'success' | 'warning' | 'danger';

export interface FlashMessage {
  readonly id: string;
  readonly text: string;
  readonly variant: FlashVariant;
  readonly timeoutMillis: number | undefined;
}

interface RunningFlashTimer {
  readonly state: 'running';
  readonly startedAt: number;
  readonly remainingMillis: number;
  readonly handle: ReturnType<typeof setTimeout>;
}

interface PausedFlashTimer {
  readonly state: 'paused';
  readonly remainingMillis: number;
}

type FlashTimer = RunningFlashTimer | PausedFlashTimer;

@Injectable({ providedIn: 'root' })
export class Flash {
  private readonly authentication = inject(Authentication);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queue = signal<ReadonlyArray<FlashMessage>>([]);
  private readonly timers = new Map<string, FlashTimer>();
  readonly messages = this.queue.asReadonly();
  readonly mode = computed(() => this.authentication.account()?.preferences.flashMode ?? 'inline');

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers.values()) {
        if (timer.state === 'running') clearTimeout(timer.handle);
      }
      this.timers.clear();
    });
  }

  show(text: string, variant: FlashVariant = 'info'): string {
    const id = crypto.randomUUID();
    const timeoutMillis = variant === 'info' || variant === 'success' ? 6_000 : undefined;
    this.queue.update((messages) => [...messages, { id, text, variant, timeoutMillis }]);
    if (timeoutMillis !== undefined) this.startTimer(id, timeoutMillis);
    return id;
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer?.state === 'running') clearTimeout(timer.handle);
    this.timers.delete(id);
    this.queue.update((messages) => messages.filter((message) => message.id !== id));
  }

  pause(id: string): void {
    const timer = this.timers.get(id);
    if (timer?.state !== 'running') return;
    clearTimeout(timer.handle);
    this.timers.delete(id);
    const elapsed = Date.now() - timer.startedAt;
    this.timers.set(id, {
      state: 'paused',
      remainingMillis: Math.max(0, timer.remainingMillis - elapsed),
    });
  }

  resume(id: string): void {
    const timer = this.timers.get(id);
    if (timer?.state !== 'paused') return;
    this.startTimer(id, timer.remainingMillis);
  }

  private startTimer(id: string, remainingMillis: number): void {
    const handle = setTimeout(() => this.dismiss(id), remainingMillis);
    this.timers.set(id, { state: 'running', startedAt: Date.now(), remainingMillis, handle });
  }
}
