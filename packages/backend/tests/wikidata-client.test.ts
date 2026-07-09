import { describe, expect, it } from 'bun:test'

import { WikidataClient } from '../src/modules/wikipedia/wikidata-client.ts'

const WIKIDATA_UNIT_PREFIX = 'http://www.wikidata.org/entity/'

const quantityClaim = (options: {
    amount: string
    unitId?: string
    year?: string
    rank?: string
}) => {
    return {
        rank: options.rank ?? 'normal',
        mainsnak: {
            datavalue: {
                type: 'quantity',
                value: {
                    amount: options.amount,
                    unit: options.unitId === undefined ? '1' : `${WIKIDATA_UNIT_PREFIX}${options.unitId}`,
                },
            },
        },
        ...(options.year === undefined
            ? {}
            : {
                  qualifiers: {
                      P585: [
                          {
                              datavalue: {
                                  value: { time: `+${options.year}-00-00T00:00:00Z` },
                              },
                          },
                      ],
                  },
              }),
    }
}

const buildFetch = (claims: Record<string, unknown[]>, labelEntities: Record<string, unknown> = {}) => {
    return async (input: string | URL) => {
        const url = new URL(input.toString())

        if (url.searchParams.get('props') === 'claims') {
            return new Response(JSON.stringify({ entities: { Q312: { claims } } }))
        }

        return new Response(JSON.stringify({ entities: labelEntities }))
    }
}

describe('WikidataClient', () => {
    it('builds metrics from quantity, time, and entity claims', async () => {
        const fetchFn = buildFetch(
            {
                P2226: [quantityClaim({ amount: '+3200000000000', unitId: 'Q4917', year: '2025' })],
                P1128: [quantityClaim({ amount: '+164000' })],
                P571: [
                    {
                        mainsnak: {
                            datavalue: { type: 'time', value: { time: '+1976-04-01T00:00:00Z' } },
                        },
                    },
                ],
                P414: [
                    {
                        mainsnak: {
                            datavalue: { type: 'wikibase-entityid', value: { id: 'Q82059' } },
                        },
                    },
                ],
            },
            { Q82059: { labels: { en: { value: 'Nasdaq' } } } },
        )

        const client = new WikidataClient(fetchFn)
        const facts = await client.getCompanyFacts('Q312')

        expect(facts?.wikidataId).toBe('Q312')

        const byLabel = new Map(facts!.metrics.map((metric) => [metric.label, metric]))
        expect(byLabel.get('Unternehmenswert')?.asOf).toBe('2025')
        expect(byLabel.get('Unternehmenswert')?.value).toContain('$')
        expect(byLabel.get('Mitarbeiter')?.value).toBe('164.000')
        expect(byLabel.get('Gegründet')?.value).toBe('1976')
        expect(byLabel.get('Börse')?.value).toBe('Nasdaq')
    })

    it('prefers the newest claim with a point-in-time qualifier', async () => {
        const fetchFn = buildFetch({
            P2139: [
                quantityClaim({ amount: '+100000000000', unitId: 'Q4917', year: '2023' }),
                quantityClaim({ amount: '+120000000000', unitId: 'Q4917', year: '2025' }),
                quantityClaim({ amount: '+110000000000', unitId: 'Q4917', year: '2024' }),
            ],
        })

        const client = new WikidataClient(fetchFn)
        const facts = await client.getCompanyFacts('Q312')

        const revenue = facts?.metrics.find((metric) => metric.label === 'Umsatz')
        expect(revenue?.asOf).toBe('2025')
    })

    it('skips deprecated claims', async () => {
        const fetchFn = buildFetch({
            P2139: [
                quantityClaim({ amount: '+999000000000', unitId: 'Q4917', year: '2026', rank: 'deprecated' }),
                quantityClaim({ amount: '+120000000000', unitId: 'Q4917', year: '2024' }),
            ],
        })

        const client = new WikidataClient(fetchFn)
        const facts = await client.getCompanyFacts('Q312')

        const revenue = facts?.metrics.find((metric) => metric.label === 'Umsatz')
        expect(revenue?.asOf).toBe('2024')
    })

    it('formats unknown currency units without a currency symbol', async () => {
        const fetchFn = buildFetch({
            // Q199 is not a currency; the value must not be shown with a guessed symbol.
            P2139: [quantityClaim({ amount: '+5000000000000', unitId: 'Q199', year: '2025' })],
        })

        const client = new WikidataClient(fetchFn)
        const facts = await client.getCompanyFacts('Q312')

        const revenue = facts?.metrics.find((metric) => metric.label === 'Umsatz')
        expect(revenue?.value).not.toContain('$')
        expect(revenue?.value).not.toContain('€')
    })

    it('returns null when the entity has no usable claims', async () => {
        const fetchFn = buildFetch({})
        const client = new WikidataClient(fetchFn)

        expect(await client.getCompanyFacts('Q312')).toBeNull()
    })
})
