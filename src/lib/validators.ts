import { z } from 'zod'

// Lenient UUID validator — accepts any syntactically valid UUID regardless of version/variant bits.
// Postgres enforces type correctness; Zod v4's built-in .uuid() rejects non-standard UUIDs (e.g. demo data).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const zId = () => z.string().regex(UUID_RE, 'UUID inválido')
