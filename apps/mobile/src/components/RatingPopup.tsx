import { useState } from "react";
import * as React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../hooks/use-theme";
import { GlassCard } from "./GlassCard";

interface RatingPopupProps {
  visible: boolean;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onDismiss: () => void;
  onSubmitFeedback?: (comment: string) => void;
  isSubmitting?: boolean;
}

export function RatingPopup({ visible, onThumbsUp, onThumbsDown, onDismiss, onSubmitFeedback, isSubmitting = false }: RatingPopupProps) {
  const theme = useTheme();
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // Reset form state when popup closes and mutation is not in progress
  // This ensures we don't reset while mutation is in progress
  React.useEffect(() => {
    if (!visible && !isSubmitting) {
      // Popup is closed and mutation is complete, reset form state
      setShowFeedbackForm(false);
      setFeedbackText("");
    }
  }, [visible, isSubmitting]);

  const handleThumbsDown = () => {
    if (isSubmitting) return; // Prevent action while submitting
    setShowFeedbackForm(true);
  };

  const handleThumbsUp = () => {
    if (isSubmitting) return; // Prevent action while submitting
    onThumbsUp();
  };

  const handleSubmitFeedback = () => {
    if (isSubmitting) return; // Prevent multiple submissions
    if (onSubmitFeedback && feedbackText.trim()) {
      onSubmitFeedback(feedbackText.trim());
      // Don't reset form state here - wait for mutation to complete
      // The form will be reset when the popup closes after successful mutation
    } else {
      onThumbsDown();
    }
  };

  const handleDismiss = () => {
    if (isSubmitting) return; // Prevent dismissal while submitting
    setShowFeedbackForm(false);
    setFeedbackText("");
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <MotiView
          from={{ translateY: -200, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: -200, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={styles.bannerContainer}
        >
          <SafeAreaView edges={["top"]} style={styles.safeArea}>
            <BlurView intensity={40} tint="dark" style={styles.banner}>
              <GlassCard style={styles.card} intensity="heavy">
                {!showFeedbackForm ? (
                  <View style={styles.content}>
                    <View style={styles.header}>
                      <Text style={[styles.title, { color: theme.colors.text }]}>
                        Help us improve
                      </Text>
                      <TouchableOpacity
                        onPress={handleDismiss}
                        style={styles.closeButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                      How was this analysis?
                    </Text>

                    <View style={styles.buttonsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          {
                            borderColor: theme.colors.primary,
                            opacity: isSubmitting ? 0.5 : 1
                          }
                        ]}
                        onPress={handleThumbsUp}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-up" size={28} color={theme.colors.primary} />
                        <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>Helpful</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          {
                            borderColor: theme.colors.primary,
                            opacity: isSubmitting ? 0.5 : 1
                          }
                        ]}
                        onPress={handleThumbsDown}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="thumbs-down" size={28} color={theme.colors.primary} />
                        <Text style={[styles.buttonLabel, { color: theme.colors.text }]}>Not helpful</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.feedbackContent}>
                    <View style={styles.header}>
                      <Text style={[styles.title, { color: theme.colors.text }]}>
                        Help us improve
                      </Text>
                      <TouchableOpacity
                        onPress={handleDismiss}
                        style={styles.closeButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                      What could we do better? Your feedback helps us improve the accuracy and usefulness of our analyses.
                    </Text>

                    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text
                          }
                        ]}
                        placeholder="Tell us what went wrong or how we can improve..."
                        placeholderTextColor={theme.colors.textSecondary}
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        autoFocus
                      />
                    </ScrollView>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          {
                            borderColor: theme.colors.border,
                            opacity: isSubmitting ? 0.5 : 1
                          }
                        ]}
                        onPress={handleDismiss}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.submitButton,
                          {
                            backgroundColor: theme.colors.primary,
                            opacity: (feedbackText.trim().length > 0 && !isSubmitting) ? 1 : 0.5
                          }
                        ]}
                        onPress={handleSubmitFeedback}
                        disabled={feedbackText.trim().length === 0 || isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.submitText, { color: "#000000" }]}>
                          {isSubmitting ? "Submitting..." : "Submit Feedback"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </GlassCard>
            </BlurView>
          </SafeAreaView>
        </MotiView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  bannerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  safeArea: {
    width: "100%"
  },
  banner: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16
  },
  card: {
    width: "100%",
    padding: 20
  },
  content: {
    width: "100%",
    alignItems: "center"
  },
  feedbackContent: {
    width: "100%"
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    position: "relative"
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    flex: 1
  },
  closeButton: {
    position: "absolute",
    right: 0,
    padding: 4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center"
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    minHeight: 80
  },
  buttonLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center"
  },
  scrollView: {
    maxHeight: 150,
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500"
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600"
  }
});
