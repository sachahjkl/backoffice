import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { createEventHistoryResource } from './event-history-resource';

describe('createEventHistoryResource', () => {
  it('loads on demand and reloads an active invalidated history', async () => {
    const active = signal(false);
    const id = signal<string | undefined>('affair-one');
    const loader = vi.fn(async (value: string) => [value]);
    const history = TestBed.runInInjectionContext(() =>
      createEventHistoryResource({ active, params: id, loader }),
    );

    expect(loader).not.toHaveBeenCalled();
    active.set(true);
    await vi.waitFor(() => expect(history.value()).toEqual(['affair-one']));

    history.invalidate();
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });

  it('defers an invalidated history until it becomes active again', async () => {
    const active = signal(true);
    const loader = vi.fn(async () => ['event']);
    const history = TestBed.runInInjectionContext(() =>
      createEventHistoryResource({ active, params: () => 'affair-one', loader }),
    );
    await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());

    active.set(false);
    history.invalidate();
    await Promise.resolve();
    expect(loader).toHaveBeenCalledOnce();

    active.set(true);
    await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  });
});
