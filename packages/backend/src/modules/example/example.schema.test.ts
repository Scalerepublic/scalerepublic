import { describe, expect, test } from 'bun:test'

import { getExampleParamsSchema } from './example.schema.ts'

describe('getExampleParamsSchema', () => {
    test('accepts a valid UUID', () => {
        const id = '550e8400-e29b-41d4-a716-446655440000'
        expect(getExampleParamsSchema.parse({ id })).toEqual({ id })
    })

    test('rejects an invalid id', () => {
        expect(() => getExampleParamsSchema.parse({ id: 'not-a-uuid' })).toThrow()
    })
})
