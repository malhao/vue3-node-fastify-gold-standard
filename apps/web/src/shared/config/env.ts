import { z } from 'zod'

// Only VITE_-prefixed vars reach the browser bundle — never put secrets here.
const envSchema = z.object({
  VITE_API_ORIGIN: z.url(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid frontend environment configuration: ${z.prettifyError(parsed.error)}`)
}

export const config = Object.freeze(parsed.data)
