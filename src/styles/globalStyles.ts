import { Platform, StyleSheet, ColorSchemeName } from 'react-native';

// ===== COLOR PALETTE =====
export const LightColors = {
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
  cardBackground: '#fff',
  white: '#fff',
  black: '#000',

  // Feedback
  success: '#4CAF50',
  successLight: '#E8F5E9',
  info: '#2196F3',
  infoLight: '#E3F2FD',

  // Tab/Navigation
  tint: '#0a7ea4',
  icon: '#687076',
  tabIconDefault: '#687076',
  tabIconSelected: '#0a7ea4',
};

export const DarkColors = {
  // Primary
  primary: '#66BB6A',
  primaryLight: '#2E7D32',
  primaryDark: '#81C784',

  // Secondary
  secondary: '#42A5F5',
  secondaryLight: '#1E88E5',
  secondaryDark: '#64B5F6',

  // Error/Warning
  error: '#EF5350',
  errorLight: '#C62828',
  errorDark: '#E57373',
  warning: '#FFA726',
  warningLight: '#EF6C00',

  // Neutral
  text: '#ECEDEE',
  textSecondary: '#B0B3B8',
  textLight: '#8E9297',

  border: '#3A3A3C',
  background: '#000000',
  cardBackground: '#1C1C1E',
  white: '#fff',
  black: '#000',

  // Feedback
  success: '#66BB6A',
  successLight: '#2E7D32',
  info: '#42A5F5',
  infoLight: '#1565C0',

  // Tab/Navigation
  tint: '#fff',
  icon: '#9BA1A6',
  tabIconDefault: '#9BA1A6',
  tabIconSelected: '#fff',
};

// Helper to get theme colors
export const getColors = (colorScheme: ColorSchemeName) => {
  return colorScheme === 'dark' ? DarkColors : LightColors;
};

// Backward compatibility - defaults to light theme
export const Colors = LightColors;

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
export const getShadows = (colorScheme: ColorSchemeName) => {
  const isDark = colorScheme === 'dark';
  return {
    small: Platform.select({
      ios: {
        shadowColor: isDark ? '#fff' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: isDark
          ? '0px 2px 3.84px rgba(255, 255, 255, 0.1)'
          : '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: isDark ? '#fff' : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: isDark
          ? '0px 4px 6px rgba(255, 255, 255, 0.15)'
          : '0px 4px 6px rgba(0, 0, 0, 0.15)',
      },
    }),
  };
};

// Backward compatibility - defaults to light theme
export const Shadows = getShadows('light');

// ===== COMMON STYLES =====
export const getCommonStyles = (colorScheme: ColorSchemeName) => {
  const colors = getColors(colorScheme);
  const shadows = getShadows(colorScheme);

  return StyleSheet.create({
    // ===== CONTAINERS =====
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
      backgroundColor: colors.background,
    },

    // ===== CARD =====
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      ...shadows.small,
    },

    cardWithMargin: {
      backgroundColor: colors.cardBackground,
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
      color: colors.text,
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.lg,
    },

    // ===== HEADERS =====
    header: {
      padding: Spacing.xl,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    headerTitle: {
      fontSize: Typography.fontSize.xxl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },

    headerSubtitle: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
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
      backgroundColor: colors.primary,
    },

    buttonSecondary: {
      backgroundColor: colors.secondary,
    },

    buttonError: {
      backgroundColor: colors.error,
    },

    buttonWarning: {
      backgroundColor: colors.warning,
    },

    buttonText: {
      color: colors.white,
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
      color: colors.text,
    },

    subtitle: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
    },

    bodyText: {
      fontSize: Typography.fontSize.md,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed,
    },

    errorText: {
      fontSize: Typography.fontSize.base,
      color: colors.error,
      textAlign: 'center',
    },

    // ===== PROGRESS BAR =====
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: BorderRadius.sm,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },

    // ===== FOOTER =====
    footer: {
      padding: Spacing.xl,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    // ===== OPTIONS/CHOICES =====
    optionButton: {
      backgroundColor: colors.cardBackground,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
      cursor: 'pointer' as any,
    },

    optionText: {
      fontSize: Typography.fontSize.base,
      color: colors.text,
      lineHeight: Typography.lineHeight.normal,
    },

    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },

    optionCorrect: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },

    optionIncorrect: {
      borderColor: colors.error,
      backgroundColor: colors.errorLight,
    },

    // ===== BADGES =====
    badge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },

    badgeSuccess: {
      backgroundColor: colors.primaryLight,
    },

    badgeError: {
      backgroundColor: colors.errorLight,
    },

    badgeInfo: {
      backgroundColor: colors.infoLight,
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
      color: colors.primary,
    },

    statLabel: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },

    // ===== MODALS & OVERLAYS =====
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      width: '90%',
      maxWidth: 400,
    },

    // ===== TOUCHABLE/INTERACTIVE =====
    touchable: {
      cursor: 'pointer' as any,
    },

    // ===== LAYOUT HELPERS =====
    flexRow: {
      flexDirection: 'row',
    },

    flexColumn: {
      flexDirection: 'column',
    },

    flexCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    flexBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // ===== FORM INPUTS =====
    input: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: Typography.fontSize.base,
      color: colors.text,
    },

    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },

    inputError: {
      borderColor: colors.error,
    },

    // ===== ICON STYLES =====
    icon: {
      fontSize: Typography.fontSize.xl,
    },

    iconSmall: {
      fontSize: Typography.fontSize.base,
    },

    iconLarge: {
      fontSize: Typography.fontSize.xxl,
    },

    iconHuge: {
      fontSize: Typography.fontSize.massive,
    },
  });
};

// Backward compatibility - defaults to light theme
export const CommonStyles = getCommonStyles('light');

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

/**
 * Helper to calculate dynamic card width for grid layouts
 */
export const getCardWidth = (screenWidth: number, columns: number, horizontalMargin: number, gap: number) => {
  return (screenWidth - horizontalMargin * 2 - gap * (columns - 1)) / columns;
};

/**
 * Common style combinations for quick access
 */
export const StyleCombinations = {
  // Centered content
  centerContent: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  // Row with space between
  rowSpaceBetween: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  // Row with items centered
  rowCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  // Full flex
  flex1: {
    flex: 1,
  },
};
