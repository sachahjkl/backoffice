import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Authentication } from '@backoffice/authentication';
import { Flash } from './flash';

describe('Flash', () => {
  let flash: Flash;

  beforeEach(() => {
    vi.useFakeTimers();
    const account = signal({
      preferences: { theme: 'light', language: 'fr', flashMode: 'inline' as const },
    });
    TestBed.configureTestingModule({
      providers: [{ provide: Authentication, useValue: { account: account.asReadonly() } }],
    });
    flash = TestBed.inject(Flash);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses success messages independently from CSS animations', () => {
    flash.show('Modification enregistrée.', 'success');
    vi.advanceTimersByTime(5_999);
    expect(flash.messages()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(flash.messages()).toHaveLength(0);
  });

  it('pauses and resumes the remaining timeout', () => {
    const id = flash.show('Modification enregistrée.', 'success');
    vi.advanceTimersByTime(2_000);
    flash.pause(id);
    vi.advanceTimersByTime(10_000);
    expect(flash.messages()).toHaveLength(1);
    flash.resume(id);
    vi.advanceTimersByTime(3_999);
    expect(flash.messages()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(flash.messages()).toHaveLength(0);
  });

  it('keeps warnings until explicit dismissal', () => {
    const id = flash.show('Vérifiez la modification.', 'warning');
    vi.advanceTimersByTime(60_000);
    expect(flash.messages()).toHaveLength(1);
    flash.dismiss(id);
    expect(flash.messages()).toHaveLength(0);
  });
});
