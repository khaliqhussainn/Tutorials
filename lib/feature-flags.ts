// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  AI_TUTOR: true,
  VOICE_FEATURES: true,
  CONCEPT_MAPPING: true,
  PERSONALIZED_LEARNING: true,
  ADVANCED_ANALYTICS: false, // Keep this false until ready
} as const

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] && !!process.env.GEMINI_API_KEY
}
