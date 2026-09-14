import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SegmentedControl } from './segmented-control';

describe('SegmentedControl', () => {
  it('uses native radios and emits the selected value', () => {
    const fixture = TestBed.createComponent(SegmentedControl<'plain' | 'blocks'>);
    fixture.componentRef.setInput('controlId', 'body-format');
    fixture.componentRef.setInput('label', 'Format du message');
    fixture.componentRef.setInput('options', [
      { value: 'plain', label: 'Texte', variant: 'default', hint: 'Sans mise en forme' },
      { value: 'blocks', label: 'Formaté' },
      { value: 'preview', label: 'Aperçu', variant: 'info' },
    ]);
    fixture.componentRef.setInput('value', 'plain');
    fixture.componentRef.setInput('variant', 'success');
    const values: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => values.push(value));
    fixture.detectChanges();

    const radios = fixture.debugElement.queryAll(By.css('input[type="radio"]'));
    expect(radios).toHaveLength(3);
    expect(radios[0]?.nativeElement.checked).toBe(true);
    expect(fixture.nativeElement.querySelector('legend')?.textContent).toContain(
      'Format du message',
    );
    expect(fixture.nativeElement.getAttribute('data-segmented-variant')).toBe('success');
    expect(radios[0]?.nativeElement.getAttribute('aria-describedby')).toMatch(/^hint-/);
    expect(
      fixture.nativeElement.querySelector('app-hint')?.getAttribute('data-segment-variant'),
    ).toBe('default');

    radios[1]?.triggerEventHandler('change');
    expect(values).toEqual(['blocks']);
  });
});
