import { Routes } from '@angular/router';
import {
  administratorGuard,
  administratorChildGuard,
  clientGuard,
  permissionData,
  permissionsGuard,
  sessionData,
} from './back-office/authentication-guards';
import { unsavedChangesGuard } from './back-office/unsaved-changes-guard';
import { TabPanelOutlet } from './shared/tabs/tab-panel';
import { billingRoutes } from './pages/back-office/billing/billing.routes';
import { bankWorkspaceRoutes } from './pages/back-office/banking/bank-workspace.routes';
import { configurationRoutes } from './pages/back-office/configuration/configuration.routes';
import { accountRoutes } from './pages/back-office/account-security/account.routes';
import { teamRoutes } from './pages/back-office/team/team.routes';
import { apiTokenRoutes } from './pages/back-office/api-tokens/api-token.routes';
import { serviceRoutes } from './pages/back-office/connections/service.routes';
import { auditRoute } from './pages/back-office/configuration/audit/audit.routes';
import { accountingRoutes } from './pages/back-office/accounting/accounting.routes';
import { publicQuoteContextChanged } from './public-quote/public-quote-navigation';
import { withShell } from './app-shell';

const tabRoutes = (defaultPath: string, panel: string, paths: readonly string[]): Routes => [
  { path: '', redirectTo: defaultPath, pathMatch: 'full' },
  ...paths.map((path) => ({ path, component: TabPanelOutlet, data: { panel, tab: path } })),
];

export const routes: Routes = [
  ...withShell('administrator', [
    ...billingRoutes,
    ...bankWorkspaceRoutes,
    ...accountingRoutes,
    ...teamRoutes,
    ...apiTokenRoutes,
    ...serviceRoutes,
    auditRoute,
  ]),
  {
    path: 'join',
    loadComponent: () =>
      import('./pages/back-office/team/team-join').then((module) => module.TeamJoin),
    canDeactivate: [unsavedChangesGuard],
    data: { shell: 'public', titleKey: 'team.join', robots: 'noindex, nofollow' },
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'quote',
    canDeactivate: [unsavedChangesGuard],
    runGuardsAndResolvers: publicQuoteContextChanged,
    loadComponent: () =>
      import('./pages/public-quote/public-quote').then((module) => module.PublicQuote),
    data: {
      shell: 'standalone',
      titleKey: 'page.public_quote',
      descriptionKey: 'page.description.public_quote',
      robots: 'noindex, nofollow',
    },
    children: [
      { path: '', redirectTo: 'summary', pathMatch: 'full' },
      { path: 'summary', component: TabPanelOutlet, data: { panel: 'summary' } },
      { path: 'document', component: TabPanelOutlet, data: { panel: 'document' } },
      { path: 'signature', component: TabPanelOutlet, data: { panel: 'signature' } },
      { path: 'confirmation', component: TabPanelOutlet, data: { panel: 'confirmation' } },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/back-office/login/login').then((module) => module.Login),
    data: {
      shell: 'public',
      titleKey: 'page.back_office',
      descriptionKey: 'page.description.back_office',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'sign-out',
    loadComponent: () =>
      import('./pages/back-office/sign-out/sign-out').then((module) => module.SignOut),
    canDeactivate: [unsavedChangesGuard],
    data: { shell: 'public', titleKey: 'backOffice.signOut', robots: 'noindex, nofollow' },
  },
  {
    path: 'bootstrap',
    loadComponent: () =>
      import('./pages/back-office/bootstrap/bootstrap').then((module) => module.Bootstrap),
    data: {
      shell: 'public',
      titleKey: 'page.back_office',
      descriptionKey: 'page.description.back_office',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/back-office/dashboard/dashboard').then((module) => module.Dashboard),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      ...permissionData('client.read', 'quote.read', 'order.read', 'invoice.read'),
      titleKey: 'page.back_office',
      descriptionKey: 'page.description.back_office',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./pages/back-office/account-security/account-layout').then(
        (module) => module.AccountLayout,
      ),
    children: accountRoutes,
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      ...sessionData(),
      titleKey: 'account.security_title',
      descriptionKey: 'page.description.back_office',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'client/account',
    loadComponent: () =>
      import('./pages/back-office/account-security/account-layout').then(
        (module) => module.AccountLayout,
      ),
    children: accountRoutes,
    canActivate: [clientGuard],
    data: {
      shell: 'client',
      titleKey: 'account.security_title',
      descriptionKey: 'page.description.back_office',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'client/documents/:kind/:documentId',
    loadComponent: () =>
      import('./pages/back-office/customer-document-detail/customer-document-detail').then(
        (module) => module.CustomerDocumentDetail,
      ),
    canActivate: [clientGuard],
    data: { shell: 'client', titleKey: 'page.back_office_client', robots: 'noindex, nofollow' },
  },
  {
    path: 'client',
    loadComponent: () =>
      import('./pages/back-office/client-portal/client-portal').then(
        (module) => module.ClientPortal,
      ),
    canActivate: [clientGuard],
    data: {
      shell: 'client',
      titleKey: 'page.back_office_client',
      descriptionKey: 'page.description.back_office_client',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'clients',
    loadComponent: () =>
      import('./pages/back-office/clients/clients').then((module) => module.Clients),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_clients',
      ...permissionData('client.read'),
      descriptionKey: 'page.description.back_office_clients',
      robots: 'noindex, nofollow',
    },
    children: tabRoutes('active', 'clients', ['active', 'archived', 'all']),
  },
  {
    path: 'purchases',
    loadComponent: () =>
      import('./pages/back-office/supplier-invoices/supplier-invoices').then(
        (module) => module.SupplierInvoicesPage,
      ),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_supplier_invoices',
      ...permissionData('supplier-invoice.read'),
      descriptionKey: 'page.description.back_office_supplier_invoices',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'purchases/new',
    loadComponent: () =>
      import('./pages/back-office/supplier-invoice-editor/supplier-invoice-editor').then(
        (module) => module.SupplierInvoiceEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      titleKey: 'supplierInvoice.createTitle',
      ...permissionData('supplier-invoice.create'),
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'purchases/analyze',
    loadComponent: () =>
      import('./pages/back-office/supplier-invoice-analysis/supplier-invoice-analysis').then(
        (module) => module.SupplierInvoiceAnalysisPage,
      ),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      titleKey: 'supplierInvoice.analysis.title',
      ...permissionData('supplier-invoice.analyze', 'supplier.read'),
      modules: ['purchasing', 'ai'],
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'purchases/payments',
    loadComponent: () =>
      import('./pages/back-office/supplier-payment-batches/supplier-payment-batches').then(
        (module) => module.SupplierPaymentBatchesPage,
      ),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      titleKey: 'supplierPaymentBatch.title',
      ...permissionData('supplier-invoice.pay', 'supplier-invoice.read'),
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'purchases/:invoiceId/edit',
    loadComponent: () =>
      import('./pages/back-office/supplier-invoice-editor/supplier-invoice-editor').then(
        (module) => module.SupplierInvoiceEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      titleKey: 'supplierInvoice.editTitle',
      ...permissionData('supplier-invoice.read', 'supplier-invoice.update'),
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'purchases/:invoiceId',
    loadComponent: () =>
      import('./pages/back-office/supplier-invoice-detail/supplier-invoice-detail').then(
        (module) => module.SupplierInvoiceDetail,
      ),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_supplier_invoices',
      ...permissionData('supplier-invoice.read'),
      descriptionKey: 'page.description.back_office_supplier_invoices',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'suppliers',
    loadComponent: () =>
      import('./pages/back-office/suppliers/suppliers').then((module) => module.Suppliers),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_suppliers',
      ...permissionData('supplier.read'),
      descriptionKey: 'page.description.back_office_suppliers',
      robots: 'noindex, nofollow',
    },
    children: tabRoutes('active', 'suppliers', ['active', 'archived', 'all']),
  },
  {
    path: 'suppliers/new',
    loadComponent: () =>
      import('./pages/back-office/supplier-editor/supplier-editor').then(
        (module) => module.SupplierEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('supplier.create'),
      titleKey: 'supplier.createTitle',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'suppliers/:supplierId/edit',
    loadComponent: () =>
      import('./pages/back-office/supplier-editor/supplier-editor').then(
        (module) => module.SupplierEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('supplier.read', 'supplier.update'),
      titleKey: 'supplier.editTitle',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'suppliers/:supplierId',
    loadComponent: () =>
      import('./pages/back-office/supplier-detail/supplier-detail').then(
        (module) => module.SupplierDetail,
      ),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      ...permissionData('supplier.read'),
      titleKey: 'page.back_office_supplier_detail',
      descriptionKey: 'page.description.back_office_supplier_detail',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'clients/new',
    loadComponent: () =>
      import('./pages/back-office/client-editor/client-editor').then(
        (module) => module.ClientEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('client.create'),
      titleKey: 'backOffice.clients.create',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'clients/:clientId/edit',
    loadComponent: () =>
      import('./pages/back-office/client-editor/client-editor').then(
        (module) => module.ClientEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('client.read', 'client.update'),
      titleKey: 'clientsWorkspace.edit',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'clients/:clientId/access/new',
    loadComponent: () =>
      import('./pages/back-office/client-detail/client-access-editor/client-access-editor').then(
        (module) => module.ClientAccessEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('client.read', 'client.access.manage'),
      titleKey: 'page.back_office_client_detail',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'clients/:clientId',
    loadComponent: () =>
      import('./pages/back-office/client-detail/client-detail').then(
        (module) => module.ClientDetail,
      ),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_client_detail',
      ...permissionData('client.read'),
      descriptionKey: 'page.description.back_office_client_detail',
      robots: 'noindex, nofollow',
    },
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile', component: TabPanelOutlet, data: { panel: 'profile' } },
      { path: 'affairs', component: TabPanelOutlet, data: { panel: 'affairs' } },
      { path: 'documents', component: TabPanelOutlet, data: { panel: 'documents' } },
      {
        path: 'access',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: { panel: 'access', ...permissionData('client.access.manage') },
      },
    ],
  },
  {
    path: 'affairs',
    loadComponent: () =>
      import('./pages/back-office/affairs/affairs').then((module) => module.Affairs),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_quotes',
      ...permissionData('affair.read'),
      descriptionKey: 'page.description.back_office_quotes',
      robots: 'noindex, nofollow',
    },
    children: tabRoutes('attention', 'affairs', ['attention', 'active', 'completed', 'all']),
  },
  {
    path: 'affairs/:affairId',
    loadComponent: () =>
      import('./pages/back-office/affair-detail/affair-detail').then(
        (module) => module.AffairDetail,
      ),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    children: [
      ...tabRoutes('overview', 'affair-detail', ['overview']),
      {
        path: 'history',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: { panel: 'affair-detail', tab: 'history', ...permissionData('audit.read') },
      },
    ],
    data: {
      shell: 'administrator',
      titleKey: 'page.back_office_affair_detail',
      ...permissionData('affair.read', 'quote.read', 'order.read', 'invoice.read'),
      descriptionKey: 'page.description.back_office_affair_detail',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'quotes/new',
    loadComponent: () =>
      import('./pages/back-office/quote-editor/quote-editor').then((module) => module.QuoteEditor),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData(
        'quote.create',
        'client.read',
        'catalog.read',
        'condition.read',
        'issuer.read',
      ),
      titleKey: 'page.back_office_quote_editor',
      descriptionKey: 'page.description.back_office_quote_editor',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'quotes/:quoteId/edit',
    loadComponent: () =>
      import('./pages/back-office/quote-editor/quote-editor').then((module) => module.QuoteEditor),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData(
        'quote.read',
        'quote.update',
        'client.read',
        'catalog.read',
        'condition.read',
        'issuer.read',
      ),
      titleKey: 'page.back_office_quote_editor',
      descriptionKey: 'page.description.back_office_quote_editor',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'quotes/:quoteId/publication',
    loadComponent: () =>
      import('./pages/back-office/quote-publication/quote-publication').then(
        (module) => module.QuotePublication,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('quote.read', 'quote.send'),
      titleKey: 'commercial.publicationTitle',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'quotes/:quoteId',
    loadComponent: () =>
      import('./pages/back-office/quote-detail/quote-detail').then((module) => module.QuoteDetail),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    canDeactivate: [unsavedChangesGuard],
    children: tabRoutes('summary', 'quote-detail', ['summary', 'document']),
    data: {
      shell: 'administrator',
      ...permissionData('quote.read'),
      titleKey: 'commercial.quote',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'orders/:orderId',
    loadComponent: () =>
      import('./pages/back-office/order-detail/order-detail').then((module) => module.OrderDetail),
    canActivate: [administratorGuard],
    data: {
      shell: 'administrator',
      ...permissionData('order.read', 'quote.read'),
      titleKey: 'commercial.order',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'catalog/new',
    loadComponent: () =>
      import('./pages/back-office/catalog-editor/catalog-editor').then(
        (module) => module.CatalogEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('catalog.manage'),
      titleKey: 'catalog.create',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'catalog/:itemId/edit',
    loadComponent: () =>
      import('./pages/back-office/catalog-editor/catalog-editor').then(
        (module) => module.CatalogEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('catalog.read', 'catalog.manage'),
      titleKey: 'catalogWorkspace.editTitle',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./pages/back-office/catalog/catalog').then((module) => module.Catalog),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      ...permissionData('catalog.read'),
      titleKey: 'catalog.title',
      robots: 'noindex, nofollow',
    },
    children: tabRoutes('active', 'catalog', ['active', 'archived', 'all']),
  },
  {
    path: 'configuration',
    loadComponent: () =>
      import('./pages/back-office/configuration/configuration').then(
        (module) => module.Configuration,
      ),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    data: {
      shell: 'administrator',
      ...sessionData(),
      titleKey: 'page.back_office_issuer_settings',
      descriptionKey: 'page.description.back_office_issuer_settings',
      robots: 'noindex, nofollow',
    },
    children: configurationRoutes,
  },
  {
    path: 'emails/new',
    loadComponent: () =>
      import('./pages/back-office/email-composer/email-composer').then(
        (module) => module.EmailComposer,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.draft.manage'),
      titleKey: 'emailsWorkspace.newMessage',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails/drafts/:draftId/edit',
    loadComponent: () =>
      import('./pages/back-office/email-composer/email-composer').then(
        (module) => module.EmailComposer,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.draft.manage'),
      titleKey: 'emailsWorkspace.editDraft',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails/messages/:operationId',
    loadComponent: () =>
      import('./pages/back-office/email-detail/email-detail').then((module) => module.EmailDetail),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.draft.manage'),
      titleKey: 'emailsWorkspace.message',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails/templates/new',
    loadComponent: () =>
      import('./pages/back-office/email-template-editor/email-template-editor').then(
        (module) => module.EmailTemplateEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.template.manage'),
      titleKey: 'emailsWorkspace.newTemplate',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails/templates/:templateId/edit',
    loadComponent: () =>
      import('./pages/back-office/email-template-editor/email-template-editor').then(
        (module) => module.EmailTemplateEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.template.manage'),
      titleKey: 'emailsWorkspace.editTemplate',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails/reminders/new',
    loadComponent: () =>
      import('./pages/back-office/reminder-editor/reminder-editor').then(
        (module) => module.ReminderEditor,
      ),
    canActivate: [administratorGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.reminder.manage'),
      titleKey: 'emailsWorkspace.newReminder',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: 'emails',
    loadComponent: () =>
      import('./pages/back-office/emails/emails').then((module) => module.Emails),
    canActivate: [administratorGuard],
    canActivateChild: [administratorChildGuard],
    canDeactivate: [unsavedChangesGuard],
    data: {
      shell: 'administrator',
      ...permissionData('email.draft.manage'),
      titleKey: 'emails.title',
      descriptionKey: 'emails.intro',
      robots: 'noindex, nofollow',
    },
    children: [
      { path: '', redirectTo: 'messages', pathMatch: 'full' },
      {
        path: 'messages',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: { panel: 'emails', tab: 'messages', ...permissionData('integration.manage') },
      },
      {
        path: 'drafts',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: { panel: 'emails', tab: 'drafts', ...permissionData('email.draft.manage') },
      },
      {
        path: 'reminders',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: {
          panel: 'emails',
          tab: 'reminders',
          ...permissionData(
            'email.reminder.manage',
            'invoice.read',
            'client.read',
            'integration.manage',
          ),
        },
      },
      {
        path: 'templates',
        component: TabPanelOutlet,
        canActivate: [permissionsGuard],
        data: { panel: 'emails', tab: 'templates', ...permissionData('email.template.manage') },
      },
    ],
  },
  {
    path: 'version',
    loadComponent: () => import('./pages/version/version').then((module) => module.Version),
    data: {
      shell: 'standalone',
      titleKey: 'page.version',
      descriptionKey: 'page.description.version',
    },
  },
  {
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((module) => module.NotFoundComponent),
    data: {
      titleKey: 'page.not_found',
      descriptionKey: 'page.description.not_found',
      robots: 'noindex, nofollow',
    },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((module) => module.NotFoundComponent),
    data: {
      titleKey: 'page.not_found',
      descriptionKey: 'page.description.not_found',
      robots: 'noindex, nofollow',
    },
  },
];
