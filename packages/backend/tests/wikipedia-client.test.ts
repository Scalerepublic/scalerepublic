import { describe, expect, it } from 'bun:test'

import { WikipediaClient } from '../src/modules/wikipedia/wikipedia-client.ts'

describe('WikipediaClient', () => {
    it('returns summary when search and page lookup succeed', async () => {
        const fetchFn = async (input: RequestInfo | URL) => {
            const url = input.toString()

            if (url.includes('action=opensearch') === true) {
                return new Response(
                    JSON.stringify(['Apple Inc.', ['Apple Inc.'], [''], ['https://en.wikipedia.org/wiki/Apple_Inc.']]),
                )
            }

            if (url.includes('/page/summary/Apple_Inc.') === true) {
                return new Response(JSON.stringify({
                    title: 'Apple Inc.',
                    extract: 'Apple Inc. is an American multinational technology company.',
                    wikibase_item: 'Q312',
                    content_urls: {
                        desktop: { page: 'https://en.wikipedia.org/wiki/Apple_Inc.' },
                    },
                }))
            }

            return new Response('not found', { status: 404 })
        }

        const client = new WikipediaClient(fetchFn)
        const summary = await client.searchSummary('Apple Inc.', 'AAPL')

        expect(summary).toEqual({
            title: 'Apple Inc.',
            extract: 'Apple Inc. is an American multinational technology company.',
            pageUrl: 'https://en.wikipedia.org/wiki/Apple_Inc.',
            wikidataId: 'Q312',
        })
    })

    it('tries alternate search queries when the first query has no match', async () => {
        const seenQueries: string[] = []
        const fetchFn = async (input: RequestInfo | URL) => {
            const url = new URL(input.toString())
            const query = url.searchParams.get('search')

            if (url.pathname.endsWith('/api.php') && query !== null) {
                seenQueries.push(query)
                if (query === 'Microsoft Corporation') {
                    return new Response(JSON.stringify([query, [], [], []]))
                }
                if (query === 'Microsoft') {
                    return new Response(
                        JSON.stringify([query, ['Microsoft'], [''], ['https://en.wikipedia.org/wiki/Microsoft']]),
                    )
                }
            }

            if (url.pathname.includes('/page/summary/Microsoft') === true) {
                return new Response(JSON.stringify({
                    title: 'Microsoft',
                    extract: 'Microsoft is an American technology corporation.',
                    content_urls: {
                        desktop: { page: 'https://en.wikipedia.org/wiki/Microsoft' },
                    },
                }))
            }

            return new Response('not found', { status: 404 })
        }

        const client = new WikipediaClient(fetchFn)
        const summary = await client.searchSummary('Microsoft Corporation', 'MSFT')

        expect(summary?.title).toBe('Microsoft')
        expect(seenQueries).toEqual(['Microsoft Corporation', 'Microsoft'])
    })

    it('returns null when no article can be found', async () => {
        const fetchFn = async () => new Response(JSON.stringify(['ZZZZ', [], [], []]))
        const client = new WikipediaClient(fetchFn)
        const summary = await client.searchSummary('ZZZZ Unknown Corp.', 'ZZZZ')

        expect(summary).toBeNull()
    })
})
