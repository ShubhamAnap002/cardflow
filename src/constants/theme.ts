/**
 * Precision Slate & Royal Azure — the palette the Stitch designs were drawn in.
 * Keep every colour/size decision here so screens stay visually consistent.
 */

export const colors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#DBEAFE',
  onPrimary: '#FFFFFF',

  background: '#FAF8FF',
  surface: '#FFFFFF',
  surfaceLow: '#F2F3FF',
  surfaceContainer: '#EAEDFF',
  surfaceHigh: '#E2E7FF',
  surfaceHighest: '#DAE2FD',

  onSurface: '#131B2E',
  onSurfaceVariant: '#434655',
  outline: '#737686',
  outlineVariant: '#C3C6D7',

  secondary: '#4648D4',
  secondarySoft: '#E1E0FF',

  tertiary: '#006242',
  tertiarySoft: '#BDFFDB',
  tertiaryFixed: '#6FFBBE',

  error: '#BA1A1A',
  errorSoft: '#FFDAD6',
  onErrorSoft: '#93000A',

  inverseSurface: '#283044',
  inverseOnSurface: '#EEF0FF',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Type ramp lifted from the Stitch tokens (Inter-like system font). */
export const type = {
  display: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  headline: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  labelLg: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodySm: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
} as const;

export const shadows = {
  card: {
    shadowColor: '#131B2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#131B2E',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fab: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/** Height of the dock row in the custom tab bar (the safe-area inset sits below it). */
export const TAB_BAR_HEIGHT = 60;

/** How far the centre scan button rises above the dock. */
export const FAB_LIFT = 22;

/** Accent rotation used for avatars and group tiles. */
export const ACCENTS = [colors.primary, colors.secondary, colors.tertiary, '#B42318'] as const;
