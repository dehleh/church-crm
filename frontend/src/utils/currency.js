const CURRENCY_SYMBOLS = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'CA$',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
  AUD: 'AU$',
};

export function getCurrencySymbol(currencyCode = 'NGN') {
  const code = String(currencyCode || 'NGN').toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
}

export function formatCurrency(amount, currencyCode = 'NGN') {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Number(amount || 0).toLocaleString()}`;
}

