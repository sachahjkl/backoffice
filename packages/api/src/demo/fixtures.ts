import { faker } from '@faker-js/faker/locale/fr';
import {
  DemoAccountingEntryCount,
  DemoAffairCount,
  DemoBankTransactionCount,
  DemoClientCount,
  DemoQuoteCount,
  DemoSupplierCount,
  DemoSupplierInvoiceCount,
} from '@froment/contracts';

/* oxlint-disable anti-slop/no-natural-language-literals -- Deterministic fixture content, not application interface prose. */

const businessProjects = [
  'Refonte du portail client',
  'Audit de conformité RGPD',
  'Déploiement du nouvel intranet',
  'Migration de la plateforme e-commerce',
  'Automatisation du suivi commercial',
  'Conception de l’application mobile',
  'Modernisation du système de facturation',
  'Création de l’identité numérique',
  'Optimisation du parcours de souscription',
  'Mise en place du reporting financier',
  'Sécurisation des accès partenaires',
  'Intégration du catalogue produits',
] as const;

const services = [
  'Atelier de cadrage fonctionnel',
  'Conception de l’architecture technique',
  'Développement et intégration',
  'Audit de sécurité applicative',
  'Design du parcours utilisateur',
  'Migration et reprise des données',
  'Configuration de la plateforme',
  'Accompagnement au déploiement',
  'Formation des équipes',
  'Maintenance corrective et évolutive',
] as const;

const purchases = [
  'Abonnement aux outils collaboratifs',
  'Hébergement de l’infrastructure',
  'Matériel informatique',
  'Conseil juridique et conformité',
  'Prestation de design graphique',
  'Licence logicielle annuelle',
  'Location de salle et équipement',
  'Campagne de communication',
  'Frais de déplacement',
  'Sous-traitance technique',
] as const;

const bankOperations = [
  'Virement client',
  'Prélèvement fournisseur',
  'Paiement par carte',
  'Frais bancaires',
  'Remboursement de frais',
  'Cotisation d’assurance',
] as const;

const accountingOperations = [
  'Régularisation des frais bancaires',
  'Abonnement logiciel du mois',
  'Remboursement de frais professionnels',
  'Ajustement de change',
  'Provision pour prestation externe',
  'Reclassement de charge',
] as const;

const cycle = <const Values extends readonly [unknown, ...Array<unknown>]>(
  values: Values,
  index: number,
): Values[number] => values[index % values.length] ?? values[0];

const emailFor = (displayName: string, index: number) => {
  const localPart = displayName
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '.')
    .replaceAll(/^\.|\.$/g, '');
  return `${localPart}.${index + 1}@example.invalid`;
};

const frenchPhone = () => `+336${faker.string.numeric(8)}`;

export const demoProfiles = [
  {
    name: 'Léa Morel',
    email: 'administrator@demo.invalid',
    roleName: 'Administration',
    profile: null,
  },
  {
    name: 'Hugo Bernard',
    email: 'collaborator@demo.invalid',
    roleName: 'Équipe commerciale',
    profile: 'collaborator',
  },
  {
    name: 'Inès Laurent',
    email: 'accountant@demo.invalid',
    roleName: 'Comptabilité',
    profile: 'accountant',
  },
  {
    name: 'Thomas Leroy',
    email: 'validator@demo.invalid',
    roleName: 'Validation comptable',
    profile: 'accounting-validator',
  },
  {
    name: 'Sofia Roux',
    email: 'reader@demo.invalid',
    roleName: 'Consultation comptable',
    profile: 'accounting-reader',
  },
] as const;

export const generateDemoFixtures = () => {
  faker.seed(20_260_913);

  const profiles = demoProfiles;

  const makeClient = (index: number) => {
    const displayName = faker.company.name();
    return {
      displayName,
      addressLine1: faker.location.streetAddress(),
      postalCode: faker.location.zipCode(),
      city: faker.location.city(),
      country: 'France',
      email: emailFor(displayName, index),
      phone: frenchPhone(),
    };
  };
  const clients: [ReturnType<typeof makeClient>, ...Array<ReturnType<typeof makeClient>>] = [
    makeClient(0),
    ...Array.from({ length: DemoClientCount - 1 }, (_, index) => makeClient(index + 1)),
  ];

  const supplierLocations = [
    { taxTreatment: 'france', country: 'France' },
    { taxTreatment: 'eu-reverse-charge', country: 'Allemagne' },
    { taxTreatment: 'non-eu-import', country: 'États-Unis' },
    { taxTreatment: 'foreign-local-tax', country: 'Canada' },
  ] as const;
  const makeSupplier = (index: number) => {
    const displayName = faker.company.name();
    const location = cycle(supplierLocations, index);
    return {
      displayName,
      addressLine1: faker.location.streetAddress(),
      postalCode: faker.location.zipCode(),
      city: faker.location.city(),
      email: emailFor(displayName, 100 + index),
      phone: frenchPhone(),
      registrationNumber: faker.string.numeric(14),
      vatNumber: `FR${faker.string.numeric(11)}`,
      ...location,
    };
  };
  const suppliers: [ReturnType<typeof makeSupplier>, ...Array<ReturnType<typeof makeSupplier>>] = [
    makeSupplier(0),
    ...Array.from({ length: DemoSupplierCount - 1 }, (_, index) => makeSupplier(index + 1)),
  ];

  const makeAffair = (index: number) => ({
    title: `${cycle(businessProjects, index)} — ${cycle(clients, index).displayName}`,
  });
  const affairs: [ReturnType<typeof makeAffair>, ...Array<ReturnType<typeof makeAffair>>] = [
    makeAffair(0),
    ...Array.from({ length: DemoAffairCount - 1 }, (_, index) => makeAffair(index + 1)),
  ];
  const quotes = Array.from({ length: DemoQuoteCount }, (_, index) => ({
    title: cycle(affairs, index).title,
    lineDescription: cycle(services, index),
  }));
  const supplierInvoices = Array.from({ length: DemoSupplierInvoiceCount }, (_, index) => ({
    lineDescription: `${cycle(purchases, index)} — ${cycle(suppliers, index).displayName}`,
  }));
  const bankTransactions = Array.from({ length: DemoBankTransactionCount }, (_, index) => ({
    description: `${cycle(bankOperations, index)} — ${
      index % 3 === 0 ? cycle(suppliers, index).displayName : cycle(clients, index).displayName
    }`,
  }));
  const accountingEntries = Array.from({ length: DemoAccountingEntryCount }, (_, index) => ({
    description: cycle(accountingOperations, index),
  }));

  return {
    profiles,
    clients,
    suppliers,
    affairs,
    quotes,
    supplierInvoices,
    bankTransactions,
    accountingEntries,
  };
};
