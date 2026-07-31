/**
 * Purpose: Provide shared class, currency, percentage, date, and initials formatting helpers.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'USD',
		notation: compact ? 'compact' : 'standard',
		maximumFractionDigits: 2
	}).format(value);
}

export function formatPercent(value: number): string {
	const sign = value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-GB').format(value);
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}
