import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";
import { GlassCard } from "./GlassCard";

interface RatingPopupProps {
  visible: boolean;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onDismiss: () => void;
}

export function RatingPopup({ visible, onThumbsUp, onThumbsDown, onDismiss }: RatingPopupProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <GlassCard style={styles.card} intensity="heavy">
            <View style={styles.content}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                How was this analysis?
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Your feedback helps us improve
              </Text>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.thumbsUpButton]}
                  onPress={onThumbsUp}
                  activeOpacity={0.7}
                >
                  <Ionicons name="thumbs-up" size={32} color="#2EFAC0" />
                  <Text style={styles.buttonLabel}>Helpful</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.thumbsDownButton]}
                  onPress={onThumbsDown}
                  activeOpacity={0.7}
                >
                  <Ionicons name="thumbs-down" size={32} color="#FF4D6D" />
                  <Text style={styles.buttonLabel}>Not helpful</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.dismissText, { color: theme.colors.textSecondary }]}>
                  Maybe later
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </MotiView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24
  },
  content: {
    alignItems: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: "center"
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    width: "100%"
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  },
  thumbsUpButton: {
    borderColor: "#2EFAC0"
  },
  thumbsDownButton: {
    borderColor: "#FF4D6D"
  },
  buttonLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF"
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  dismissText: {
    fontSize: 14
  }
});

