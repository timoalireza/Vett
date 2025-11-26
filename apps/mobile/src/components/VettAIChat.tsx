import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VettAIChatProps {
  visible: boolean;
  onClose: () => void;
  analysisId?: string;
  analysisData?: {
    claim?: string;
    verdict?: string;
    score?: number;
    summary?: string;
    sources?: Array<{ title: string; url: string }>;
  };
  onSendMessage: (message: string, analysisId?: string) => Promise<string>;
}

export function VettAIChat({
  visible,
  onClose,
  analysisId,
  analysisData,
  onSendMessage
}: VettAIChatProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      // Add welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm VettAI, your fact-checking assistant. I can help you understand this analysis, explain the verdict, discuss sources, or answer questions about the claim. What would you like to know?",
          timestamp: new Date()
        }
      ]);
    }
  }, [visible]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await onSendMessage(userMessage.content, analysisId);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("[VettAI] Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: error?.message?.includes("Pro members")
          ? "VettAI is only available for Pro members. Please upgrade to access this feature."
          : "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 200 }}
        style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={16} color="#2EFAC0" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble
          ]}
        >
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </View>
      </MotiView>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <BlurView intensity={20} tint="dark" style={styles.overlay}>
          <MotiView
            from={{ translateY: 500 }}
            animate={{ translateY: 0 }}
            transition={{ type: "spring", damping: 25 }}
            style={styles.modalContent}
          >
            <BlurView intensity={30} tint="dark" style={styles.chatContainer}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.02)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.chatGradient}
              />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Ionicons name="sparkles" size={20} color="#2EFAC0" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>VettAI</Text>
                    <Text style={styles.headerSubtitle}>Your fact-checking assistant</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask about this analysis..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || loading}
                  style={[
                    styles.sendButton,
                    { opacity: input.trim() && !loading ? 1 : 0.5 }
                  ]}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
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
    width: "100%",
    height: "85%"
  },
  chatContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(15, 15, 15, 0.95)",
    overflow: "hidden"
  },
  chatGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(46, 250, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2
  },
  closeButton: {
    padding: 4
  },
  messagesList: {
    padding: 20,
    paddingBottom: 10
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start"
  },
  userMessage: {
    justifyContent: "flex-end"
  },
  assistantMessage: {
    justifyContent: "flex-start"
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(46, 250, 192, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16
  },
  userBubble: {
    backgroundColor: "#2EFAC0",
    borderBottomRightRadius: 4
  },
  assistantBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular"
  },
  userText: {
    color: "#000000"
  },
  assistantText: {
    color: "rgba(255, 255, 255, 0.9)"
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 12
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2EFAC0",
    alignItems: "center",
    justifyContent: "center"
  }
});

