export function periodChangeToAmount(price: number, periodChangePercent: number): number {
	return price - price / (1 + periodChangePercent / 100);
}
