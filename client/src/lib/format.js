import { format } from 'date-fns';

export const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export function thisMonth() {
  return format(new Date(), 'yyyy-MM');
}

export function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function prettyDate(value) {
  return format(new Date(value), 'dd MMM yyyy');
}
