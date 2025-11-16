export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  REMEMBER_ME_REFRESH: '30d',
} as const;

export const RATE_LIMITS = {
  GLOBAL: {
    MAX: 100,
    TIME_WINDOW: '15 minutes',
  },
  AUTH: {
    MAX: 5,
    TIME_WINDOW: '15 minutes',
  },
} as const;

export const PLATFORM = {
  WEB: 'web',
  MOBILE: 'mobile',
} as const;

export type Platform = typeof PLATFORM[keyof typeof PLATFORM];
