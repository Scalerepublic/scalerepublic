export type ProxyEnv = {
    UNI_API_ORIGIN: string
    UNI_API_PROXY_SECRET: string
}

const ipv4Pattern = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

const resolveUpstreamOrigin = (origin: string): string => {
    const trimmed = origin.replace(/\/$/, '')
    let parsed: URL
    try {
        parsed = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`)
    } catch {
        return trimmed
    }

    if (parsed.protocol === 'https:' && ipv4Pattern.test(parsed.hostname)) {
        parsed.protocol = 'http:'
    }

    if (ipv4Pattern.test(parsed.hostname)) {
        const nipHost = parsed.hostname.replace(/\./g, '-')
        return `${parsed.protocol}//${nipHost}.nip.io${parsed.port ? `:${parsed.port}` : ''}`
    }

    return `${parsed.protocol}//${parsed.host}`
}

const isAuthorized = (request: Request, secret: string): boolean => {
    const configured = secret.trim()
    if (configured === '') {
        return false
    }
    const provided = request.headers.get('X-Uni-Proxy-Secret') ?? ''
    if (provided.length !== configured.length) {
        return false
    }
    let mismatch = 0
    for (let i = 0; i < configured.length; i += 1) {
        mismatch |= configured.charCodeAt(i) ^ provided.charCodeAt(i)
    }
    return mismatch === 0
}

const redactTarget = (url: string): string => url.replace(/token=[^&]+/gi, 'token=[redacted]')

export default {
    async fetch(request: Request, env: ProxyEnv): Promise<Response> {
        if (!isAuthorized(request, env.UNI_API_PROXY_SECRET)) {
            return new Response('Forbidden', { status: 403 })
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response('Method Not Allowed', { status: 405 })
        }

        const incoming = new URL(request.url)
        if (!incoming.pathname.startsWith('/stocks')) {
            return new Response('Not Found', { status: 404 })
        }

        const origin = resolveUpstreamOrigin(env.UNI_API_ORIGIN)
        const target = `${origin}${incoming.pathname}${incoming.search}`

        let upstream: Response
        try {
            upstream = await fetch(target, {
                method: request.method,
                headers: {
                    Accept: 'application/json',
                },
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.error(`[uni-proxy] fetch failed ${redactTarget(target)}: ${message}`)
            return new Response('Bad Gateway', { status: 502 })
        }

        if (!upstream.ok) {
            const body = await upstream.text()
            console.error(
                `[uni-proxy] upstream ${upstream.status} ${redactTarget(target)}: ${body.slice(0, 300)}`,
            )
            return new Response('Upstream request failed', {
                status: upstream.status === 403 ? 403 : 502,
            })
        }

        const headers = new Headers()
        const contentType = upstream.headers.get('Content-Type')
        if (contentType !== null) {
            headers.set('Content-Type', contentType)
        }

        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers,
        })
    },
}
