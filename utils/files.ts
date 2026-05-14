export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Only JPEG, PNG, WebP, or GIF images are allowed.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Each image must be 8MB or smaller.'
  }
  return null
}

const LAYOUT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const MAX_LAYOUT_BYTES = 20 * 1024 * 1024

export function validateLayoutFile(file: File): string | null {
  if (!LAYOUT_TYPES.includes(file.type as (typeof LAYOUT_TYPES)[number])) {
    return 'Finished layout must be JPEG, PNG, WebP, or PDF.'
  }
  if (file.size > MAX_LAYOUT_BYTES) {
    return 'Maximum layout file size is 20MB.'
  }
  return null
}

const MAX_PAYMENT_PROOF_BYTES = 10 * 1024 * 1024

/** Payment / GCash receipt screenshots (images only). */
export function validatePaymentProofFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Payment screenshots must be JPEG, PNG, WebP, or GIF.'
  }
  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    return 'Payment screenshot must be 10MB or smaller.'
  }
  return null
}
