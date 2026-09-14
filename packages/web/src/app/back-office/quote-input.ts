const decimalPattern = /^\d+(?:[.,]\d+)?$/;

export const parseFixedDecimal = (value: string, decimalPlaces: number): number | undefined => {
  const normalized = value.trim();
  if (!decimalPattern.test(normalized)) return undefined;
  const [integerPart, fractionPart = ''] = normalized.replace(',', '.').split('.');
  if (fractionPart.length > decimalPlaces) return undefined;
  const factor = 10 ** decimalPlaces;
  const result = Number(integerPart) * factor + Number(fractionPart.padEnd(decimalPlaces, '0'));
  if (!Number.isSafeInteger(result)) return undefined;
  return result;
};

export const formatFixedDecimal = (
  value: number,
  decimalPlaces: number,
  decimalSeparator: '.' | ',' = '.',
): string => {
  const factor = 10 ** decimalPlaces;
  const integerPart = Math.floor(value / factor);
  const fractionPart = String(value % factor).padStart(decimalPlaces, '0');
  return `${integerPart}${decimalSeparator}${fractionPart}`;
};

export const formatDecimal = (
  value: number,
  decimalPlaces: number,
  decimalSeparator: '.' | ',' = '.',
): string =>
  formatFixedDecimal(value, decimalPlaces, decimalSeparator)
    .replace(/0+$/, '')
    .replace(/[.,]$/, '');

const roundHalfUp = (numerator: bigint, denominator: bigint): bigint =>
  (numerator + denominator / 2n) / denominator;

export interface LineAmounts {
  readonly netTotalCents: number;
  readonly vatTotalCents: number;
  readonly totalCents: number;
}

export interface LineDecimalValue {
  readonly quantity: string;
  readonly unitPrice: string;
  readonly vatRate: string;
}

export const calculateLineAmounts = (
  quantity: string,
  unitPrice: string,
  vatRate: string,
): LineAmounts | undefined => {
  const quantityMilli = parseFixedDecimal(quantity, 3);
  const unitPriceCents = parseFixedDecimal(unitPrice, 2);
  const vatRateBasisPoints = parseFixedDecimal(vatRate, 2);
  if (
    quantityMilli === undefined ||
    quantityMilli === 0 ||
    unitPriceCents === undefined ||
    vatRateBasisPoints === undefined ||
    vatRateBasisPoints > 10_000
  )
    return undefined;
  const netTotal = roundHalfUp(BigInt(quantityMilli) * BigInt(unitPriceCents), 1_000n);
  const vatTotal = roundHalfUp(netTotal * BigInt(vatRateBasisPoints), 10_000n);
  const total = netTotal + vatTotal;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
  return {
    netTotalCents: Number(netTotal),
    vatTotalCents: Number(vatTotal),
    totalCents: Number(total),
  };
};

export const calculateLineTotalCents = (
  quantity: string,
  unitPrice: string,
  vatRate: string,
): number | undefined => calculateLineAmounts(quantity, unitPrice, vatRate)?.totalCents;

export const calculateLineSummary = (
  lines: ReadonlyArray<LineDecimalValue>,
): LineAmounts | undefined => {
  const amounts = lines.map((line) =>
    calculateLineAmounts(line.quantity, line.unitPrice, line.vatRate),
  );
  if (amounts.some((amount) => amount === undefined)) return undefined;
  const netTotal = amounts.reduce((total, amount) => total + BigInt(amount!.netTotalCents), 0n);
  const vatTotal = amounts.reduce((total, amount) => total + BigInt(amount!.vatTotalCents), 0n);
  const total = netTotal + vatTotal;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
  return {
    netTotalCents: Number(netTotal),
    vatTotalCents: Number(vatTotal),
    totalCents: Number(total),
  };
};
