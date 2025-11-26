import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";
import { GlassCard } from "./GlassCard";

interface FeedbackFormProps {
  visible: boolean;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
}

export function FeedbackForm({ visible, onSubmit, onCancel }: FeedbackFormProps) {
  const theme = useTheme();
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    onSubmit(comment.trim());
    setComment("");
  };

  const handleCancel = () => {
    setComment("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <BlurView intensity={20} tint="dark" style={styles.overlay}>
          <MotiView
            from={{ translateY: 300 }}
            animate={{ translateY: 0 }}
            transition={{ type: "spring", damping: 25 }}
            style={styles.modalContent}
          >
            <GlassCard style={styles.card} intensity="heavy">
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Help us improve
                </Text>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                What could we do better? Your feedback helps us improve the accuracy and usefulness
                of our analyses.
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
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoFocus
                />
              </ScrollView>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { opacity: comment.trim().length > 0 ? 1 : 0.5 }
                  ]}
                  onPress={handleSubmit}
                  disabled={comment.trim().length === 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitText}>Submit Feedback</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </MotiView>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  modalContent: {
    width: "100%"
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    maxHeight: "80%"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "600"
  },
  closeButton: {
    padding: 4
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20
  },
  scrollView: {
    flex: 1,
    marginBottom: 24
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200
  },
  actions: {
    flexDirection: "row",
    gap: 12
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center"
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
    backgroundColor: "#2EFAC0",
    alignItems: "center"
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000"
  }
});

