import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { pressKey } from '@shared/filter-choice/filter-choice.spec-helper';
import { I18nService } from '@app/i18n.service';
import { FilterSelect } from './filter-select';

@Component({
  imports: [FilterSelect, FormField],
  template: `<label
    >Client<select appFilterSelect [formField]="fields.client">
      <option value=""></option>
      <option value="a">Acme</option>
      <option value="b">Beta</option>
      <option value="c">Gamma</option>
    </select></label
  >`,
})
class FilterSelectHost {
  readonly value = signal({ client: '' });
  readonly fields = form(this.value);
}

@Component({
  imports: [FilterSelect],
  template: `<label
    >État<select appFilterSelect>
      <option value="all">Tous</option>
      <option value="draft">Brouillon</option>
      <option value="ready">Prêt</option>
    </select></label
  >`,
})
class ShortFilterSelectHost {}

@Component({
  imports: [FilterSelect, FormsModule],
  template: `<label
    >Profils<select appFilterSelect multiple [(ngModel)]="profiles">
      <option value="admin">Administration</option>
      <option value="sales">Vente</option>
    </select></label
  >`,
})
class MultiFilterSelectHost {
  profiles: Array<string> = [];
}

describe('FilterSelect', () => {
  it('applies the shared select appearance to its host', async () => {
    const fixture = TestBed.createComponent(ShortFilterSelectHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('select').classList).toContain('select');
  });

  it('omits filtering for three options', async () => {
    const fixture = TestBed.createComponent(ShortFilterSelectHost);
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('select')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('[data-filter-select-search]')).toBeNull();
    expect(document.activeElement).toBe(overlay.querySelector('.option'));
  });

  it('filters options and updates a signal form control', async () => {
    const fixture = TestBed.createComponent(FilterSelectHost);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const select = root.querySelector<HTMLSelectElement>('select')!;
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const search = overlay.querySelector<HTMLInputElement>('[data-filter-select-search]')!;
    expect(overlay.querySelector<HTMLButtonElement>('button.option')?.textContent?.trim()).toBe(
      TestBed.inject(I18nService).t('listControls.none'),
    );
    search.value = 'bet';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    const options = overlay.querySelectorAll<HTMLButtonElement>('button.option');
    expect(options).toHaveLength(1);
    options[0]!.click();
    await fixture.whenStable();
    expect(select.value).toBe('b');
    expect(fixture.componentInstance.value().client).toBe('b');
    expect(overlay.querySelector('[role="dialog"]')).toBeNull();
  });

  it('supports native multi-select form bindings', async () => {
    const fixture = TestBed.createComponent(MultiFilterSelectHost);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root
      .querySelector('select')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const options = overlay.querySelectorAll<HTMLButtonElement>('button.option');
    options[0]!.click();
    options[1]!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.profiles).toEqual(['admin', 'sales']);
    overlay.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await fixture.whenStable();
    expect(overlay.querySelector('[role="dialog"]')).toBeNull();
  });

  it('moves through options with arrows and selects with Enter', async () => {
    const fixture = TestBed.createComponent(FilterSelectHost);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root
      .querySelector('select')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const search = overlay.querySelector<HTMLInputElement>('[data-filter-select-search]')!;
    pressKey(search, 'ArrowDown', 40);
    const options = overlay.querySelectorAll<HTMLButtonElement>('button.option');
    expect(document.activeElement).toBe(options[0]);
    pressKey(options[0]!, 'ArrowDown', 40);
    expect(document.activeElement).toBe(options[1]);
    pressKey(options[1]!, 'Enter', 13);
    await fixture.whenStable();
    expect(fixture.componentInstance.value().client).toBe('a');
    expect(overlay.querySelector('[role="dialog"]')).toBeNull();
  });
});
