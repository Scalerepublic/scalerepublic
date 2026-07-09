import { z } from 'zod'

const OpenSearchResponseSchema = z.tuple([
    z.string(),
    z.array(z.string()),
    z.array(z.string()),
    z.array(z.string()),
])

const SummaryResponseSchema = z.object({
    title: z.string(),
    extract: z.string(),
    wikibase_item: z.string().optional(),
    content_urls: z.object({
        desktop: z.object({
            page: z.string().url(),
        }),
    }),
})

export type WikipediaSummary = {
    title: string
    extract: string
    pageUrl: string
    wikidataId: string | null
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>

const COMPANY_SUFFIX_PATTERN =
    /\s*,?\s*(Inc\.?|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|PLC|N\.?V\.?|S\.?A\.?|AG|SE|Group|Holdings?)\s*$/i

export class WikipediaClient {
    constructor(private readonly fetchFn: FetchLike = fetch) {}

    private normalizeSearchQuery(companyName: string): string {
        return companyName.replace(COMPANY_SUFFIX_PATTERN, '').trim()
    }

    private buildSearchQueries(companyName: string, ticker: string): string[] {
        const normalized = this.normalizeSearchQuery(companyName)
        const queries = [companyName, normalized, `${normalized} company`, `${ticker} stock`]
        return [...new Set(queries.filter((query) => query.length > 0))]
    }

    async searchSummary(companyName: string, ticker: string): Promise<WikipediaSummary | null> {
        for (const query of this.buildSearchQueries(companyName, ticker)) {
            const title = await this.searchTitle(query)
            if (title === null) continue

            const summary = await this.getSummary(title)
            if (summary !== null) return summary
        }

        return null
    }

    private async searchTitle(query: string): Promise<string | null> {
        const url = new URL('https://en.wikipedia.org/w/api.php')
        url.searchParams.set('action', 'opensearch')
        url.searchParams.set('search', query)
        url.searchParams.set('limit', '1')
        url.searchParams.set('namespace', '0')
        url.searchParams.set('format', 'json')

        const res = await this.fetchFn(url.toString(), {
            headers: { 'User-Agent': 'ScaleRepublic/1.0 (stock descriptions; contact@scalerepublic.com)' },
        })
        if (!res.ok) return null

        const parsed = OpenSearchResponseSchema.safeParse(await res.json())
        if (!parsed.success) return null

        return parsed.data[1][0] ?? null
    }

    private async getSummary(title: string): Promise<WikipediaSummary | null> {
        const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'))
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`

        const res = await this.fetchFn(url, {
            headers: { 'User-Agent': 'ScaleRepublic/1.0 (stock descriptions; contact@scalerepublic.com)' },
        })
        if (!res.ok) return null

        const parsed = SummaryResponseSchema.safeParse(await res.json())
        if (!parsed.success) return null

        const extract = parsed.data.extract.trim()
        if (extract.length === 0) return null

        return {
            title: parsed.data.title,
            extract,
            pageUrl: parsed.data.content_urls.desktop.page,
            wikidataId: parsed.data.wikibase_item ?? null,
        }
    }
}
