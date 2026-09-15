import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Authentication } from '@backoffice/authentication';
import { Flash } from './flash';
import { FlashOutlet } from './flash-outlet';

describe('FlashOutlet', () => {
  let fixture: ComponentFixture<FlashOutlet>;
  let flash: Flash;

  beforeEach(async () => {
    const account = signal({
      preferences: { theme: 'light', language: 'fr', flashMode: 'toast' as const },
    });
    TestBed.configureTestingModule({
      providers: [{ provide: Authentication, useValue: { account: account.asReadonly() } }],
    });
    fixture = TestBed.createComponent(FlashOutlet);
    flash = TestBed.inject(Flash);
    await fixture.whenStable();
  });

  it('renders the account mode without coupling dismissal to CSS animation events', async () => {
    flash.show('Modification enregistrée.', 'success');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.getAttribute('data-flash-mode')).toBe('toast');
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Modification enregistrée.');
    const message = root.querySelector<HTMLElement>('.flash-message')!;
    expect(message.style.getPropertyValue('--flash-duration')).toBe('6000ms');
    message.querySelector('.flash-progress')!.dispatchEvent(new Event('animationend'));
    await fixture.whenStable();
    expect(root.querySelector('.flash-message')).not.toBeNull();
    flash.dismiss(flash.messages()[0]!.id);
  });

  it('keeps errors until explicit dismissal', async () => {
    flash.show('Échec.', 'danger');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('Échec.');
    expect(root.querySelector('.flash-progress')).toBeNull();
    root.querySelector<HTMLButtonElement>('.flash-dismiss')!.click();
    await fixture.whenStable();
    expect(root.querySelector('.flash-message')).toBeNull();
  });

  it('dismisses a message after a horizontal touch gesture', async () => {
    flash.show('Message tactile.');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const message = root.querySelector<HTMLElement>('.flash-message')!;
    message.setPointerCapture = vi.fn();
    message.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10 }));
    message.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 80 }));
    message.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 80 }));
    await fixture.whenStable();
    expect(root.querySelector('.flash-message')).toBeNull();
  });
});
