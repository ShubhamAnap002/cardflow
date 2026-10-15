/**
 * CardFlow light theme — product blue, white surfaces, dark ink.
 */

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
} as const;

export const colors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#DBEAFE',
  onPrimary: '#FFFFFF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLow: '#F1F5F9',
  surfaceContainer: '#E2E8F0',
  surfaceHigh: '#DBEAFE',
  surfaceHighest: '#BFDBFE',

  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  outline: '#64748B',
  outlineVariant: '#CBD5E1',

  secondary: '#1E3A8A',
  secondarySoft: '#DBEAFE',

  tertiary: '#1D4ED8',
  tertiarySoft: '#EFF6FF',
  tertiaryFixed: '#93C5FD',

  error: '#BA1A1A',
  errorSoft: '#FFDAD6',
  onErrorSoft: '#93000A',

  inverseSurface: '#0F172A',
  inverseOnSurface: '#F8FAFC',

  favorite: '#D97706',

  /** Camera / live QR canvas (dark for contrast with the viewfinder). */
  scanCanvas: '#0B1220',
  scanAccent: '#93C5FD',
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

export const type = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  labelLg: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fab: {
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

export const TAB_BAR_HEIGHT = 60;

export const ACCENTS = [colors.primary, colors.secondary, colors.tertiaryFixed, '#1D4ED8'] as const;
