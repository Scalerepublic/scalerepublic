import { beforeEach, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'

import { createAppContext } from '../../src/context.ts'
import { db } from '../../src/db/index.ts'
import { notification } from '../../src/db/schema/notification.ts'
import { portfolio } from '../../src/db/schema/portfolio/portfolio.ts'
import { resetDb, seedPortfolio, seedPrice, seedStock } from '../helpers/db.ts'

const ctx = createAppContext()

const getNotifications = (userId: string) =>
    db.select().from(notification).where(eq(notification.userId, userId))

const getByKey = async (key: string) => {
    const [row] = await db.select().from(notification).where(eq(notification.key, key))
    return row
}

beforeEach(resetDb)

describe('NotificationService', () => {
    test('creates a notification', async () => {
        const { userId } = await seedPortfolio()

        const created = await ctx.notificationService.create({
            userId,
            type: 'AUTOTRADE_TRIGGERED',
            key: 'test:1',
            data: { ticker: 'GME' },
        })

        expect(created).not.toBeNull()
        expect(created!.read).toBe(false)
        expect(created!.data).toEqual({ ticker: 'GME' })
    })

    test('dedupes on key: a second insert with the same key is a no-op', async () => {
        const { userId } = await seedPortfolio()

        const first = await ctx.notificationService.create({ userId, type: 'AUTOTRADE_FAILED', key: 'dup' })
        const second = await ctx.notificationService.create({ userId, type: 'AUTOTRADE_FAILED', key: 'dup' })

        expect(first).not.toBeNull()
        expect(second).toBeNull()
        expect(await getNotifications(userId)).toHaveLength(1)
    })

    test('lists a user notifications newest first and filters unread', async () => {
        const { userId } = await seedPortfolio()
        await ctx.notificationService.create({ userId, type: 'AUTOTRADE_TRIGGERED', key: 'a' })
        const b = await ctx.notificationService.create({ userId, type: 'AUTOTRADE_EXPIRED', key: 'b' })
        await ctx.notificationService.markAsRead(b!.id, userId)

        const all = await ctx.notificationService.getByUserId(userId)
        expect(all).toHaveLength(2)

        const unread = await ctx.notificationService.getByUserId(userId, { unreadOnly: true })
        expect(unread).toHaveLength(1)
        expect(unread[0]!.key).toBe('a')
    })

    test('unread count and mark-all-as-read', async () => {
        const { userId } = await seedPortfolio()
        await ctx.notificationService.create({ userId, type: 'AUTOTRADE_TRIGGERED', key: 'a' })
        await ctx.notificationService.create({ userId, type: 'AUTOTRADE_EXPIRED', key: 'b' })

        expect(await ctx.notificationService.getUnreadCount(userId)).toBe(2)

        const updated = await ctx.notificationService.markAllAsRead(userId)
        expect(updated).toBe(2)
        expect(await ctx.notificationService.getUnreadCount(userId)).toBe(0)
    })

    test('markAsRead is scoped to the owner', async () => {
        const { userId } = await seedPortfolio()
        const other = await seedPortfolio({ email: 'other@test.com' })
        const own = await ctx.notificationService.create({ userId, type: 'AUTOTRADE_TRIGGERED', key: 'own' })

        const result = await ctx.notificationService.markAsRead(own!.id, other.userId)
        expect(result).toBeNull()
        expect((await getByKey('own'))!.read).toBe(false)
    })
})

describe('auto-trade notification emission', () => {
    test('emits a TRIGGERED notification when a rule fires', async () => {
        const { userId, portfolioId } = await seedPortfolio({ cashBalance: '10000.00' })
        const { stockId } = await seedStock({ ticker: 'CHEAP' })
        await seedPrice(stockId, 20)

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 5,
        })
        await ctx.autoTradeService.executeAutoTrade(rule)

        const notif = await getByKey(`autotrade:${rule.id}:triggered`)
        expect(notif).toBeDefined()
        expect(notif!.userId).toBe(userId)
        expect(notif!.type).toBe('AUTOTRADE_TRIGGERED')
        expect(notif!.data).toMatchObject({ ticker: 'CHEAP', ruleType: 'BUY', quantity: 5 })
    })

    test('emits a FAILED notification when funds run out, and dedupes across ticks', async () => {
        const { portfolioId } = await seedPortfolio({ cashBalance: '100.00' })
        const { stockId } = await seedStock()
        await seedPrice(stockId, 20)

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 5,
        })
        await db.update(portfolio).set({ cashBalance: '10.00' }).where(eq(portfolio.id, portfolioId))

        await ctx.autoTradeService.executeAutoTrade(rule)
        await ctx.autoTradeService.executeAutoTrade(rule)

        const failed = await db
            .select()
            .from(notification)
            .where(and(eq(notification.key, `autotrade:${rule.id}:failed`), eq(notification.type, 'AUTOTRADE_FAILED')))
        expect(failed).toHaveLength(1)
        expect(failed[0]!.data).toMatchObject({ reason: 'INSUFFICIENT_FUNDS' })
    })

    test('emits an EXPIRED notification when a rule expires', async () => {
        const { portfolioId } = await seedPortfolio()
        const { stockId } = await seedStock()

        const rule = await ctx.autoTradeService.createAutoTrade({
            portfolioId, stockId, ruleType: 'BUY', triggerDirection: 'AT_OR_BELOW', priceThreshold: 20, quantity: 1,
            expiresAt: new Date(Date.now() + 60_000),
        })
        await ctx.autoTradeService.expireAutoTrades(new Date(Date.now() + 120_000))

        const notif = await getByKey(`autotrade:${rule.id}:expired`)
        expect(notif).toBeDefined()
        expect(notif!.type).toBe('AUTOTRADE_EXPIRED')
    })
})
