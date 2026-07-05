export type ProxyEnv = {
    UNI_API_ORIGIN: string
    UNI_API_PROXY_SECRET: string
}

const normalizeOrigin = (origin: string): string => origin.replace(/\/$/, '')

const isAuthorized = (request: Request, secret: string): boolean => {
    const configured = secret.trim()
    if (configured === '') {
        return false
    }
    return request.headers.get('X-Uni-Proxy-Secret') === configured
}

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

        const origin = normalizeOrigin(env.UNI_API_ORIGIN)
        const target = `${origin}${incoming.pathname}${incoming.search}`

        const upstream = await fetch(target, {
            method: request.method,
            headers: {
                Accept: 'application/json',
            },
        })

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
