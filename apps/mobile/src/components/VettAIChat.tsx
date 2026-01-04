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
  Platform,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

import { useTheme } from "../hooks/use-theme";
import type { ChatUsageInfo, VettAIChatResponse } from "../api/vettai";
import { getChatUsage } from "../api/vettai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
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
  onSendMessage: (message: string, analysisId?: string) => Promise<VettAIChatResponse>;
  initialChatUsage?: ChatUsageInfo | null;
}

export function VettAIChat({
  visible,
  onClose,
  analysisId,
  analysisData,
  onSendMessage,
  initialChatUsage
}: VettAIChatProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatUsage, setChatUsage] = useState<ChatUsageInfo | null>(initialChatUsage ?? null);
  const flatListRef = useRef<FlatList>(null);

  // Update chat usage when initial value changes
  useEffect(() => {
    if (initialChatUsage) {
      setChatUsage(initialChatUsage);
    }
  }, [initialChatUsage]);

  // Refresh chat usage when modal opens to ensure limits are current
  // This handles cases where the day changed while the user had the result screen open
  useEffect(() => {
    if (visible) {
      const refreshUsage = async () => {
        try {
          const usage = await getChatUsage();
          setChatUsage(usage);
        } catch (error) {
          // Silently fail - we'll use cached usage or let server handle errors
          console.debug("[VettChat] Could not refresh chat usage:", error);
        }
      };
      refreshUsage();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && messages.length === 0) {
      // Add welcome message with context-aware intro
      const welcomeContent = analysisData?.claim
        ? "I can help you understand this analysis. Ask me about the verdict, the sources used, or any specific aspect of the claim you'd like to explore."
        : "I can help you understand fact-check analyses. If you have questions about a specific analysis, open the chat from that result page.";
      
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeContent,
          timestamp: new Date()
        }
      ]);
    }
  }, [visible, analysisData?.claim]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Note: We intentionally allow the message to be sent even if client thinks limit is reached.
    // The server will handle day-change resets and return the updated usage info.
    // This prevents UX issues where the client shows "limit reached" after midnight
    // but the server has already reset the counter.

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
      const result = await onSendMessage(userMessage.content, analysisId);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response,
        citations: result.citations || [],
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Update chat usage from response
      if (result.chatUsage) {
        setChatUsage(result.chatUsage);
      }
    } catch (error: any) {
      console.error("[VettChat] Error sending message:", error);
      
      // Determine appropriate error message
      let errorContent = "Unable to process your request at this time. Please try again.";
      
      if (error?.message?.includes("limit reached") || error?.message?.includes("daily limit") || error?.message?.includes("Chat limit reached")) {
        errorContent = "You've reached your daily message limit. Your limit resets at midnight, or you can upgrade to Pro for unlimited access.";
      } else if (error?.message?.includes("Plus and Pro") || error?.message?.includes("Upgrade")) {
        errorContent = "Vett Chat is available for Plus and Pro members. Upgrade to access this feature.";
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitationPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn(`Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error(`Error opening URL: ${url}`, error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    const hasCitations = !isUser && item.citations && item.citations.length > 0;
    
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
        <View style={{ maxWidth: "75%" }}>
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
          
          {/* Citations Section */}
          {hasCitations && (
            <View style={styles.citationsContainer}>
              <View style={styles.citationsHeaderContainer}>
                <Ionicons name="link" size={12} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.citationsHeader}>Sources:</Text>
              </View>
              {item.citations!.map((citation, index) => {
                // Extract domain name from URL for display
                let displayText = citation;
                try {
                  const url = new URL(citation);
                  displayText = url.hostname.replace('www.', '');
                } catch {
                  // If URL parsing fails, use the citation as-is
                }
                
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleCitationPress(citation)}
                    style={styles.citationButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.citationNumber}>[{index + 1}]</Text>
                    <Text style={styles.citationText} numberOfLines={1}>
                      {displayText}
                    </Text>
                    <Ionicons name="open-outline" size={12} color="#2EFAC0" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
                    <Text style={styles.headerTitle}>Vett Chat</Text>
                    <Text style={styles.headerSubtitle}>
                      {!chatUsage
                        ? "Ask follow-up questions"
                        : chatUsage.maxDaily === null
                          ? "Unlimited access"
                          : chatUsage.remaining !== null && chatUsage.remaining !== undefined
                            ? `${chatUsage.remaining} message${chatUsage.remaining !== 1 ? "s" : ""} remaining today`
                            : "Ask follow-up questions"
                      }
                    </Text>
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
                  maxLength={1000}
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
  },
  citationsContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    gap: 6
  },
  citationsHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4
  },
  citationsHeader: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  citationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 250, 192, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(46, 250, 192, 0.2)",
    gap: 8
  },
  citationNumber: {
    color: "#2EFAC0",
    fontSize: 11,
    fontFamily: "Inter_700Bold"
  },
  citationText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontFamily: "Inter_400Regular"
  }
});

