import { colors } from '@/constants/theme';

/**
 * Auth screens share the global light brand palette.
 * Kept as a named export so auth UI can stay readable without dark mode.
 */
export const authColors = {
  bg: colors.background,
  bgMid: colors.surfaceLow,
  surface: colors.surface,
  surfaceRaised: colors.surfaceLow,
  border: colors.outlineVariant,
  borderFocus: colors.primary,
  neon: colors.primary,
  neonBright: colors.tertiaryFixed,
  neonDim: 'rgba(13,148,136,0.28)',
  neonSoft: colors.primarySoft,
  ink: colors.onSurface,
  muted: colors.onSurfaceVariant,
  mutedStrong: colors.outline,
  white: colors.surface,
  danger: colors.error,
} as const;
