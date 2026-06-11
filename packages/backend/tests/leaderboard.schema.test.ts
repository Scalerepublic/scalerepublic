import { describe, expect, test } from 'bun:test'

import { leaderboardQuerySchema } from '../src/modules/leaderboard/leaderboard.schema.ts'

describe('leaderboardQuerySchema', () => {
    test('defaults limit to 10', () => {
        expect(leaderboardQuerySchema.parse({})).toEqual({ limit: 10 })
    })

    test('coerces and accepts a valid limit', () => {
        expect(leaderboardQuerySchema.parse({ limit: '25' })).toEqual({ limit: 25 })
    })

    test('rejects limit above 100', () => {
        expect(() => leaderboardQuerySchema.parse({ limit: 101 })).toThrow()
    })
})
