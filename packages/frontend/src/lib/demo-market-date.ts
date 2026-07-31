/**
 * Purpose: Hold the optional simulated-market clock override used throughout frontend date calculations.
 */
let overrideIso: string | null = null;

export function setDemoMarketDate(iso: string | null) {
	overrideIso = iso;
}

export function getEffectiveMarketDate(): string {
	return overrideIso ?? new Date().toISOString().slice(0, 10);
}
