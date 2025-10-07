import { Platform, StyleSheet } from 'react-native';

// ===== COLOR PALETTE =====
export const Colors = {
  // Primary
  primary: '#4CAF50',
  primaryLight: '#E8F5E9',
  primaryDark: '#2E7D32',

  // Secondary
  secondary: '#2196F3',
  secondaryLight: '#E3F2FD',
  secondaryDark: '#1976D2',

  // Error/Warning
  error: '#f44336',
  errorLight: '#FFEBEE',
  errorDark: '#c62828',
  warning: '#FF9800',
  warningLight: '#FFF3E0',

  // Neutral
  text: '#333',
  textSecondary: '#666',
  textLight: '#999',

  border: '#e0e0e0',
  background: '#f5f5f5',
  white: '#fff',
  black: '#000',

  // Feedback
  success: '#4CAF50',
  successLight: '#E8F5E9',
  info: '#2196F3',
  infoLight: '#E3F2FD',
};

// ===== SPACING =====
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 15,
  xl: 20,
  xxl: 30,
};

// ===== TYPOGRAPHY =====
export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 15,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
    massive: 48,
    giant: 64,
  },

  // Font Weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 20,
    normal: 22,
    relaxed: 24,
    loose: 26,
    extraLoose: 28,
  },
};

// ===== BORDER RADIUS =====
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  round: 9999,
};

// ===== SHADOWS (Platform-specific) =====
export const Shadows = {
  small: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
    web: {
      boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.15)',
    },
  }),
};

// ===== COMMON STYLES =====
export const CommonStyles = StyleSheet.create({
  // ===== CONTAINERS =====
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },

  // ===== CARD =====
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.small,
  },

  cardWithMargin: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // ===== SECTION =====
  section: {
    marginVertical: 10,
  },

  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },

  // ===== HEADERS =====
  header: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  // ===== BUTTONS =====
  button: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },

  buttonPrimary: {
    backgroundColor: Colors.primary,
  },

  buttonSecondary: {
    backgroundColor: Colors.secondary,
  },

  buttonError: {
    backgroundColor: Colors.error,
  },

  buttonWarning: {
    backgroundColor: Colors.warning,
  },

  buttonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // ===== PRESSED STATE =====
  pressed: {
    opacity: 0.7,
  },

  // ===== TEXT =====
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },

  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },

  bodyText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed,
  },

  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    textAlign: 'center',
  },

  // ===== PROGRESS BAR =====
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },

  // ===== FOOTER =====
  footer: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // ===== OPTIONS/CHOICES =====
  optionButton: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    cursor: 'pointer' as any,
  },

  optionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    lineHeight: Typography.lineHeight.normal,
  },

  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  optionCorrect: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  optionIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },

  // ===== BADGES =====
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },

  badgeSuccess: {
    backgroundColor: Colors.primaryLight,
  },

  badgeError: {
    backgroundColor: Colors.errorLight,
  },

  badgeInfo: {
    backgroundColor: Colors.infoLight,
  },

  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },

  // ===== STATS =====
  statCard: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: Typography.fontSize.huge,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },

  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

// ===== UTILITY FUNCTIONS =====
export const getCardStyle = (margin = true) => [
  CommonStyles.card,
  margin && {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  }
];

export const getButtonStyle = (type: 'primary' | 'secondary' | 'error' | 'warning' = 'primary') => {
  const baseStyle = CommonStyles.button;
  switch (type) {
    case 'primary':
      return [baseStyle, CommonStyles.buttonPrimary];
    case 'secondary':
      return [baseStyle, CommonStyles.buttonSecondary];
    case 'error':
      return [baseStyle, CommonStyles.buttonError];
    case 'warning':
      return [baseStyle, CommonStyles.buttonWarning];
    default:
      return [baseStyle, CommonStyles.buttonPrimary];
  }
};

/**
 * Helper function to get safe area padding for a container.
 * Use with useSafeAreaInsets() from react-native-safe-area-context.
 *
 * @example
 * ```tsx
 * import { useSafeAreaInsets } from 'react-native-safe-area-context';
 * import { getSafeAreaPadding } from '@/styles/globalStyles';
 *
 * const insets = useSafeAreaInsets();
 * const safeAreaStyle = getSafeAreaPadding(insets, ['top']);
 *
 * <View style={[styles.container, safeAreaStyle]}>
 *   <YourContent />
 * </View>
 * ```
 */
export const getSafeAreaPadding = (
  insets: { top: number; bottom: number; left: number; right: number },
  edges: ('top' | 'bottom' | 'left' | 'right')[] = ['top'],
  minimumPadding = 0
) => ({
  paddingTop: edges.includes('top') ? Math.max(insets.top, minimumPadding) : 0,
  paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, minimumPadding) : 0,
  paddingLeft: edges.includes('left') ? Math.max(insets.left, minimumPadding) : 0,
  paddingRight: edges.includes('right') ? Math.max(insets.right, minimumPadding) : 0,
});
