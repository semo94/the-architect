import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";

export function LogoutButton() {
  const styles = useStyles();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  const performLogout = async (): Promise<boolean> => {
    try {
      setIsLoggingOut(true);
      await logout();
      return true;
    } catch {
      Alert.alert("Error", "Failed to logout. Please try again.");
      return false;
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogout = () => {
    setIsConfirmVisible(true);
  };

  const handleCancel = () => {
    if (!isLoggingOut) {
      setIsConfirmVisible(false);
    }
  };

  const handleConfirmLogout = async () => {
    const isSuccess = await performLogout();
    if (isSuccess) {
      setIsConfirmVisible(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogout}
        disabled={isLoggingOut}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Logout"
        accessibilityHint="Logout from your account"
        accessibilityState={{ disabled: isLoggingOut }}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Logout</Text>
        )}
      </TouchableOpacity>

      <ConfirmDialog
        visible={isConfirmVisible}
        title="Logout"
        message="Are you sure you want to logout?"
        cancelText="Cancel"
        confirmText="Logout"
        destructive
        isLoading={isLoggingOut}
        onCancel={handleCancel}
        onConfirm={() => {
          void handleConfirmLogout();
        }}
      />
    </>
  );
}

function useStyles() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return React.useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: colors.error,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: "center",
          marginHorizontal: spacing.lg,
          marginTop: spacing.xl,
          marginBottom: spacing.xxl,
          minHeight: 48,
          justifyContent: "center",
        },
        buttonText: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: "#FFFFFF",
        },
      }),
    [colors, spacing, typography, borderRadius],
  );
}
