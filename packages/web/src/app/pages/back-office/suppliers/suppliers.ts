import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import type { SupplierSummaryValue } from '@froment/contracts';

import { SuppliersApi } from '@backoffice/suppliers-api';
import { I18nService } from '@app/i18n.service';
import { Badge, type BadgeVariant } from '@froment/ui';
import { Button } from '@shared/button/button';
import { Can } from '@backoffice/can';
import { DataTable } from '@shared/data-table/data-table';
import { EmptyState } from '@shared/empty-state/empty-state';
import { Notice } from '@shared/notice/notice';
import { PageHeader } from '@shared/page-header/page-header';
import { TabLayout, TabPanel } from '@shared/tabs/tab-panel';
import { Tabs, type TabItem } from '@shared/tabs/tabs';
import { TableSort } from '@shared/table-sort/table-sort';
import { createWorkspaceTable, type WorkspaceTableOptions } from '../configuration/workspace-table';

type SupplierView = 'active' | 'archived' | 'all';

const supplierTableOptions: WorkspaceTableOptions<SupplierSummaryValue> = {
  columns: [
    { kind: 'text', key: 'name', value: (item) => item.displayName },
    { kind: 'text', key: 'contact', value: (item) => item.email || item.phone },
    { kind: 'text', key: 'country', value: (item) => item.country },
    { kind: 'text', key: 'currency', value: (item) => item.defaultCurrency },
    { kind: 'number', key: 'paymentTerms', value: (item) => item.paymentTermsDays },
    { kind: 'text', key: 'status', value: (item) => (item.archived ? 'archived' : 'active') },
  ],
  defaultSort: 'nameAsc',
  id: (item) => item.id,
  searchKeys: [
    'displayName',
    'email',
    'phone',
    'city',
    'country',
    'registrationNumber',
    'vatNumber',
  ],
};

@Component({
  host: { class: 'page-container' },
  selector: 'app-suppliers',
  imports: [
    Badge,
    Button,
    Can,
    DataTable,
    EmptyState,
    Notice,
    PageHeader,
    RouterLink,
    RouterOutlet,
    TabLayout,
    TabPanel,
    Tabs,
    TableSort,
  ],
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Suppliers {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(SuppliersApi);
  private readonly destroyRef = inject(DestroyRef);
  private loadGeneration = 0;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly suppliers = signal<ReadonlyArray<SupplierSummaryValue>>([]);
  protected readonly table = createWorkspaceTable(this.suppliers, supplierTableOptions);
  protected readonly query = computed(() => this.table.query().q);
  protected readonly tabs = computed<readonly TabItem[]>(() =>
    (['active', 'archived', 'all'] as const).map((view) => ({
      path: view,
      id: `suppliers-${view}-tab`,
      label: this.i18n.t(`supplier.tab.${view}`),
    })),
  );
  constructor() {
    afterNextRender(() => {
      void this.load();
    });
  }

  protected visible(view: SupplierView): ReadonlyArray<SupplierSummaryValue> {
    return this.table
      .rows()
      .filter((supplier) => view === 'all' || supplier.archived === (view === 'archived'));
  }

  protected setQuery(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    const value = event.currentTarget.value.slice(0, 120);
    this.table.search(value);
  }

  protected clearQuery(input: HTMLInputElement): void {
    input.value = '';
    this.table.search('');
    input.focus();
  }

  protected statusVariant(supplier: SupplierSummaryValue): BadgeVariant {
    return supplier.archived ? 'warning' : 'success';
  }

  protected statusLabel(supplier: SupplierSummaryValue) {
    return this.i18n.t(supplier.archived ? 'supplier.archived' : 'supplier.active');
  }

  protected emptyTitle() {
    return this.i18n.t(this.query() ? 'supplier.noMatches' : 'supplier.empty');
  }

  protected emptyIntro() {
    return this.i18n.t(this.query() ? 'supplier.changeSearch' : 'supplier.emptyIntro');
  }

  protected detailQuery() {
    return this.table.params();
  }

  protected async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    this.state.set('loading');
    try {
      const suppliers = await this.api.list();
      if (generation !== this.loadGeneration || this.destroyRef.destroyed) return;
      this.suppliers.set(suppliers);
      this.state.set('ready');
    } catch {
      if (generation === this.loadGeneration && !this.destroyRef.destroyed) this.state.set('error');
    }
  }
}
