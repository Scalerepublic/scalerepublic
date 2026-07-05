export const readEnvNumber = (key: string, fallback: number): number => {
    const raw = process.env[key]
    if (raw === undefined || raw.trim() === '') {
        return fallback
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
}
