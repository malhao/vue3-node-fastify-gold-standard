import { z } from 'zod'

// Only VITE_-prefixed vars reach the browser bundle — never put secrets here.
const envSchema = z.object({
  VITE_API_ORIGIN: z.url(),
  // Dev bearer token for the stub auth (sent by the generated client). Not a real secret.
  VITE_API_TOKEN: z.string().optional(),
  // Vendor-neutral: points at the local OTel Collector, not a vendor — see observability.md.
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid frontend environment configuration: ${z.prettifyError(parsed.error)}`)
}

export const config = Object.freeze(parsed.data)
