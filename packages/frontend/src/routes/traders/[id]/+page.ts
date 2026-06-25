import { error } from '@sveltejs/kit';
import { api, parseApiData } from '$lib/api/client';
import type { BackendPortfolioPayload, BackendUserProfile } from '$lib/api/backend-types';
import { mapPortfolioPayload, mapTraderHoldings, mapTraderSummary } from '$lib/api/mappers';

export async function load({ params }: { params: { id: string } }) {
	try {
		const [profileRes, portfolioRes] = await Promise.all([
			api.api.v1.users[':id'].$get({ param: { id: params.id } }),
			api.api.v1.users[':id'].portfolio.$get({ param: { id: params.id } })
		]);

		const profile = await parseApiData<BackendUserProfile>(profileRes);
		const portfolioPayload = await parseApiData<BackendPortfolioPayload>(portfolioRes);

		const portfolio = mapPortfolioPayload(portfolioPayload);
		const holdings = mapTraderHoldings(portfolio);
		const summary = mapTraderSummary(portfolio, holdings);

		return {
			profile,
			portfolio,
			holdings,
			summary
		};
	} catch {
		error(404, 'Trader not found');
	}
}
