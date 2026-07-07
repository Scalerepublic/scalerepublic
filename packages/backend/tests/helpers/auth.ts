import type { App } from '../../src/context.ts'

import { TEST_PASSWORD } from './db.ts'

const cookieHeaderFromSetCookie = (setCookie: string): string =>
    setCookie
        .split(/,(?=[^;]+?=)/)
        .map((part) => part.split(';')[0]?.trim())
        .filter((part): part is string => part !== undefined && part !== '')
        .join('; ')

export const authHeadersFor = async (app: App, email: string): Promise<Record<string, string>> => {
    const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
    })

    if (!res.ok) {
        throw new Error(`Sign in failed: ${res.status} ${await res.text()}`)
    }

    const setCookie = res.headers.get('set-cookie')
    if (setCookie === null || setCookie === '') {
        throw new Error('Sign in succeeded but no session cookie was returned')
    }

    return { Cookie: cookieHeaderFromSetCookie(setCookie) }
}
