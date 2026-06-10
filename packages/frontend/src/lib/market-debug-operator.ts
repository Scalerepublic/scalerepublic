const OPERATOR_EMAIL = (import.meta.env.VITE_MARKET_DEBUG_OPERATOR_EMAIL ?? 'test@test.com')
	.trim()
	.toLowerCase();

export function isMarketDebugOperator(email: string | null | undefined): boolean {
	if (!email) return false;
	return email.trim().toLowerCase() === OPERATOR_EMAIL;
}
