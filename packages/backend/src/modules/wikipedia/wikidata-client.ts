import { z } from 'zod'

import type { FetchLike } from './wikipedia-client.ts'

const EntityResponseSchema = z.object({
    entities: z.record(
        z.string(),
        z.object({
            labels: z
                .record(z.string(), z.object({ value: z.string() }))
                .optional(),
            claims: z.record(z.string(), z.array(z.unknown())).optional(),
        }),
    ),
})

export type CompanyFactMetric = {
    label: string
    value: string
    asOf: string | null
}

export type CompanyFacts = {
    wikidataId: string
    metrics: CompanyFactMetric[]
}

// Wikidata entity IDs for currencies used as quantity units.
const CURRENCY_UNITS: Record<string, string> = {
    Q4917: 'USD',
    Q4916: 'EUR',
    Q25224: 'GBP',
    Q8146: 'JPY',
    Q25344: 'CHF',
    Q39099: 'CNY',
    Q31015: 'HKD',
    Q1104069: 'CAD',
    Q259502: 'AUD',
    Q122922: 'SEK',
    Q132643: 'NOK',
    Q25417: 'DKK',
    Q202040: 'KRW',
    Q80524: 'INR',
    Q208526: 'TWD',
}

type WikidataClaim = {
    rank?: string
    mainsnak: {
        datavalue?: {
            type: string
            value: unknown
        }
    }
    qualifiers?: Record<string, Array<{ datavalue?: { value: unknown } }>>
}

export class WikidataClient {
    constructor(private readonly fetchFn: FetchLike = fetch) {}

    async getCompanyFacts(wikidataId: string): Promise<CompanyFacts | null> {
        const entity = await this.fetchEntity(wikidataId)
        if (entity === null) return null

        const entityIds = new Set<string>()
        const metrics: CompanyFactMetric[] = []

        this.collectAmountMetrics(entity.claims, metrics)
        this.collectEntityIds(entity.claims, entityIds)

        const labels = await this.fetchEntityLabels([...entityIds])
        this.collectLabeledMetrics(entity.claims, labels, metrics)

        if (metrics.length === 0) return null

        return { wikidataId, metrics }
    }

    private collectAmountMetrics(
        claims: Record<string, unknown[] | undefined> | undefined,
        metrics: CompanyFactMetric[],
    ): void {
        if (claims === undefined) return

        const amountFields: Array<[string, string, boolean?]> = [
            ['Unternehmenswert', 'P2226'],
            ['Umsatz', 'P2139'],
            ['Nettogewinn', 'P2295'],
            ['Betriebsergebnis', 'P3362'],
            ['Bilanzsumme', 'P2403'],
            ['Mitarbeiter', 'P1128', false],
        ]

        for (const [label, propertyId, preferYear] of amountFields) {
            const claim = this.pickBestAmountClaim(claims[propertyId], preferYear ?? true)
            if (claim === null) continue
            metrics.push({
                label,
                value: this.formatAmount(claim.amount, claim.unitId),
                asOf: claim.asOf,
            })
        }

        const founded = this.pickTimeClaim(claims.P571)
        if (founded !== null) {
            metrics.push({ label: 'Gegründet', value: founded, asOf: null })
        }
    }

    private collectEntityIds(
        claims: Record<string, unknown[] | undefined> | undefined,
        entityIds: Set<string>,
    ): void {
        if (claims === undefined) return

        for (const propertyId of ['P414', 'P452', 'P159'] as const) {
            for (const claim of claims[propertyId] ?? []) {
                const id = this.entityIdFromClaim(claim as WikidataClaim)
                if (id !== null) entityIds.add(id)
            }
        }
    }

    private collectLabeledMetrics(
        claims: Record<string, unknown[] | undefined> | undefined,
        labels: Map<string, string>,
        metrics: CompanyFactMetric[],
    ): void {
        if (claims === undefined) return

        const labeledFields: Array<[string, 'P414' | 'P452' | 'P159', boolean?]> = [
            ['Branche', 'P452'],
            ['Börse', 'P414'],
            ['Hauptsitz', 'P159', true],
        ]

        for (const [label, propertyId, firstOnly] of labeledFields) {
            const values = this.entityLabelsFromClaims(claims[propertyId], labels)
            if (values.length === 0) continue
            metrics.push({
                label,
                value: firstOnly === true ? values[0]! : values.join(', '),
                asOf: null,
            })
        }
    }

    private async fetchEntity(wikidataId: string) {
        const url = new URL('https://www.wikidata.org/w/api.php')
        url.searchParams.set('action', 'wbgetentities')
        url.searchParams.set('ids', wikidataId)
        url.searchParams.set('props', 'claims')
        url.searchParams.set('format', 'json')

        const res = await this.fetchFn(url.toString(), {
            headers: { 'User-Agent': 'ScaleRepublic/1.0 (company facts; contact@scalerepublic.com)' },
        })
        if (!res.ok) return null

        const parsed = EntityResponseSchema.safeParse(await res.json())
        if (!parsed.success) return null

        return parsed.data.entities[wikidataId] ?? null
    }

    private async fetchEntityLabels(ids: string[]): Promise<Map<string, string>> {
        if (ids.length === 0) return new Map()

        const url = new URL('https://www.wikidata.org/w/api.php')
        url.searchParams.set('action', 'wbgetentities')
        url.searchParams.set('ids', ids.join('|'))
        url.searchParams.set('props', 'labels')
        url.searchParams.set('languages', 'de|en')
        url.searchParams.set('format', 'json')

        const res = await this.fetchFn(url.toString(), {
            headers: { 'User-Agent': 'ScaleRepublic/1.0 (company facts; contact@scalerepublic.com)' },
        })
        if (!res.ok) return new Map()

        const parsed = EntityResponseSchema.safeParse(await res.json())
        if (!parsed.success) return new Map()

        const labels = new Map<string, string>()
        for (const [id, entity] of Object.entries(parsed.data.entities)) {
            const label = entity.labels?.de?.value ?? entity.labels?.en?.value
            if (label !== undefined) labels.set(id, label)
        }
        return labels
    }

    private pickBestAmountClaim(
        claims: unknown[] | undefined,
        preferYear: boolean,
    ): { amount: number; unitId: string | null; asOf: string | null } | null {
        if (claims === undefined || claims.length === 0) return null

        const parsed = claims
            .map((claim) => this.parseAmountClaim(claim as WikidataClaim))
            .filter((claim): claim is NonNullable<typeof claim> => claim !== null)
            .sort((a, b) => {
                if (a.preferred !== b.preferred) return a.preferred ? -1 : 1
                return (b.asOf ?? '').localeCompare(a.asOf ?? '')
            })

        if (parsed.length === 0) return null

        if (preferYear) {
            const withYear = parsed.find((claim) => claim.asOf !== null)
            if (withYear !== undefined) return withYear
        }

        return parsed[0] ?? null
    }

    private parseAmountClaim(claim: WikidataClaim): {
        amount: number
        unitId: string | null
        asOf: string | null
        preferred: boolean
    } | null {
        if (claim.rank === 'deprecated') return null

        const value = claim.mainsnak.datavalue?.value
        if (typeof value !== 'object' || value === null || !('amount' in value)) return null

        const amount = Number.parseFloat(String((value as { amount: string }).amount).replace('+', ''))
        if (!Number.isFinite(amount)) return null

        const unitUrl = (value as { unit?: string }).unit
        const unitId = unitUrl?.split('/').pop() ?? null
        const asOf = this.extractPointInTime(claim.qualifiers)

        return { amount, unitId, asOf, preferred: claim.rank === 'preferred' }
    }

    private pickTimeClaim(claims: unknown[] | undefined): string | null {
        const claim = claims?.[0] as WikidataClaim | undefined
        const value = claim?.mainsnak.datavalue?.value
        if (typeof value !== 'object' || value === null || !('time' in value)) return null

        const time = String((value as { time: string }).time)
        const match = /^\+?(\d{4})/.exec(time)
        return match?.[1] ?? null
    }

    private extractPointInTime(
        qualifiers: WikidataClaim['qualifiers'],
    ): string | null {
        const point = qualifiers?.P585?.[0]?.datavalue?.value
        if (typeof point !== 'object' || point === null || !('time' in point)) return null

        const time = String((point as { time: string }).time)
        const yearMatch = /^\+?(\d{4})/.exec(time)
        return yearMatch?.[1] ?? null
    }

    private entityIdFromClaim(claim: WikidataClaim): string | null {
        const value = claim.mainsnak.datavalue?.value
        if (typeof value !== 'object' || value === null || !('id' in value)) return null
        return String((value as { id: string }).id)
    }

    private entityLabelsFromClaims(
        claims: unknown[] | undefined,
        labels: Map<string, string>,
    ): string[] {
        if (claims === undefined) return []

        const values: string[] = []
        for (const claim of claims) {
            const id = this.entityIdFromClaim(claim as WikidataClaim)
            if (id === null) continue
            const label = labels.get(id)
            if (label !== undefined && !values.includes(label)) values.push(label)
        }
        return values
    }

    private formatAmount(amount: number, unitId: string | null): string {
        if (unitId === '1' || unitId === null) {
            return new Intl.NumberFormat('de-DE').format(amount)
        }

        const compactOptions: Intl.NumberFormatOptions = {
            notation: Math.abs(amount) >= 1_000_000_000 ? 'compact' : 'standard',
            maximumFractionDigits: 1,
        }

        const currency = CURRENCY_UNITS[unitId]
        if (currency === undefined) {
            // Unknown unit: show the bare number rather than guessing a wrong currency symbol.
            return new Intl.NumberFormat('de-DE', compactOptions).format(amount)
        }

        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency,
            ...compactOptions,
        }).format(amount)
    }
}
