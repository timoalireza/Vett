import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { AnalysisCardHorizontal } from "../../src/components/AnalysisCardHorizontal";
import { submitAnalysis } from "../../src/api/analysis";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalysis } from "../../src/api/analysis";

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Mock analyses - will be replaced with real API call
  // TODO: Connect to real API endpoint for listing analyses
  const mockAnalyses = [
    {
      id: "1",
      title: "WHO Treaty Deep-Dive",
      topic: "Health",
      score: 85,
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&q=80",
      imageAttribution: {
        photographer: "National Cancer Institute",
        photographerProfileUrl: "https://unsplash.com/@nci?utm_source=vett&utm_medium=referral",
        unsplashPhotoUrl: "https://unsplash.com/photos/photo-1576091160399-112ba8d25d1f?utm_source=vett&utm_medium=referral",
        isGenerated: false
      }
    },
    {
      id: "2",
      title: "Viral Clip Reality Check",
      topic: "Media",
      score: 78,
      imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      imageAttribution: {
        photographer: "Solen Feyissa",
        photographerProfileUrl: "https://unsplash.com/@solenfeyissa?utm_source=vett&utm_medium=referral",
        unsplashPhotoUrl: "https://unsplash.com/photos/photo-1611162617474-5b21e879e113?utm_source=vett&utm_medium=referral",
        isGenerated: false
      }
    },
    {
      id: "3",
      title: "Elections Integrity Watch",
      topic: "Political",
      score: 92,
      imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a78e?w=800&q=80",
      imageAttribution: {
        photographer: "Element5 Digital",
        photographerProfileUrl: "https://unsplash.com/@element5digital?utm_source=vett&utm_medium=referral",
        unsplashPhotoUrl: "https://unsplash.com/photos/photo-1529107386315-e1a2ed48a78e?utm_source=vett&utm_medium=referral",
        isGenerated: false
      }
    }
  ];

  const placeholderTopic = useMemo(() => {
    if (input.includes("election") || input.includes("treaty")) return "political";
    if (input.includes("flu") || input.includes("cdc")) return "health";
    if (input.includes("image") || input.includes("video")) return "media";
    return "general";
  }, [input]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitAnalysis({
        text: input.trim().length ? input.trim() : null,
        contentUri: null,
        mediaType: "TEXT",
        topicHint: placeholderTopic.toUpperCase()
      }),
    onSuccess: ({ analysisId }) => {
      setSheetVisible(false);
      setErrorMessage(null);
      router.push({
        pathname: `/result/${analysisId}`
      });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    }
  });

  const handleAnalyze = () => {
    if (!input.trim().length) {
      setErrorMessage("Please paste a link or description before analyzing.");
      return;
    }
    submitMutation.mutate();
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "ios" ? 60 : 40,
            paddingBottom: theme.spacing(6)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.text,
                fontSize: theme.typography.heading,
                fontWeight: "700",
                letterSpacing: -0.5
              }
            ]}
          >
            Vett
          </Text>
        </View>

        {/* Dominant glass card for new analysis - Multiple concentrated color points with blur */}
        <TouchableOpacity
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.9}
          style={styles.mainCard}
        >
          <View
            style={[
              styles.mainCardGradient,
              {
                borderRadius: theme.radii.lg,
                overflow: "hidden",
                backgroundColor: "rgba(10, 14, 26, 0.85)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)"
              }
            ]}
          >
            {/* Dark base background */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(10, 14, 26, 0.90)"
                }
              ]}
            />
            
            {/* Concentrated color point 1 - Top left (bright blue) */}
            <View
              style={[
                styles.colorSpot,
                {
                  position: "absolute",
                  top: -40,
                  left: -40,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  overflow: "hidden"
                }
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(90, 143, 212, 0.95)",
                  "rgba(90, 143, 212, 0.70)",
                  "rgba(90, 143, 212, 0.40)",
                  "rgba(90, 143, 212, 0)"
                ]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            
            {/* Concentrated color point 2 - Top right (bright teal) */}
            <View
              style={[
                styles.colorSpot,
                {
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  overflow: "hidden"
                }
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(106, 168, 184, 0.90)",
                  "rgba(106, 168, 184, 0.65)",
                  "rgba(106, 168, 184, 0.35)",
                  "rgba(106, 168, 184, 0)"
                ]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            
            {/* Concentrated color point 3 - Bottom left (bright purple-blue) */}
            <View
              style={[
                styles.colorSpot,
                {
                  position: "absolute",
                  bottom: -50,
                  left: -20,
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  overflow: "hidden"
                }
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(138, 127, 168, 0.85)",
                  "rgba(138, 127, 168, 0.60)",
                  "rgba(138, 127, 168, 0.30)",
                  "rgba(138, 127, 168, 0)"
                ]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            
            {/* Concentrated color point 4 - Bottom right (bright blue) */}
            <View
              style={[
                styles.colorSpot,
                {
                  position: "absolute",
                  bottom: -40,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  overflow: "hidden"
                }
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(90, 143, 212, 0.90)",
                  "rgba(90, 143, 212, 0.65)",
                  "rgba(90, 143, 212, 0.35)",
                  "rgba(90, 143, 212, 0)"
                ]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            
            {/* Blur filter over entire card, under text - extends beyond edges to cover gaps */}
            <BlurView
              intensity={60}
              tint="dark"
              style={{
                position: "absolute",
                top: -20,
                left: -20,
                right: -20,
                bottom: -20
              }}
            />
            
            {/* Content */}
            <View style={styles.mainCardContent}>
              <View style={styles.mainCardHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: theme.radii.md
                    }
                  ]}
                >
                  <Ionicons name="scan-outline" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.mainCardText}>
                  <Text
                    style={[
                      styles.mainCardTitle,
                      {
                        color: "#FFFFFF",
                        fontSize: theme.typography.heading,
                        lineHeight: theme.typography.heading * theme.typography.lineHeight.tight,
                        fontWeight: "700"
                      }
                    ]}
                  >
                    Analyze Content
                  </Text>
                  <Text
                    style={[
                      styles.mainCardSubtitle,
                      {
                        color: "rgba(255, 255, 255, 0.75)",
                        fontSize: theme.typography.body,
                        marginTop: theme.spacing(0.5)
                      }
                    ]}
                  >
                    Paste a link, upload a post, or import a screenshot
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent analyses horizontal scroll */}
        {mockAnalyses.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.caption,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: theme.spacing(2)
                }
              ]}
            >
              Recent Analyses
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.analysesScrollContent}
            >
              {mockAnalyses.map((analysis) => (
                <AnalysisCardHorizontal
                  key={analysis.id}
                  id={analysis.id}
                  title={analysis.title}
                  score={analysis.score}
                  topic={analysis.topic}
                  imageUrl={analysis.imageUrl}
                  imageAttribution={analysis.imageAttribution}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Analysis input sheet */}
      <AnalyzeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        input={input}
        onChange={setInput}
        onAnalyze={handleAnalyze}
        topic={placeholderTopic}
        loading={submitMutation.isPending}
        errorMessage={errorMessage}
      />
    </GradientBackground>
  );
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  input: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  topic: string;
  loading?: boolean;
  errorMessage?: string | null;
}

function AnalyzeSheet({ visible, onClose, input, onChange, onAnalyze, topic, loading, errorMessage }: SheetProps) {
  const theme = useTheme();
  
  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      transparent
      statusBarTranslucent
    >
      <BlurView
        intensity={20}
        tint="dark"
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.sheetContainer}>
          <GlassCard
            intensity="heavy"
            radius="lg"
            style={[
              styles.sheetCard,
              {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                padding: theme.spacing(3)
              }
            ]}
          >
            {/* Handle */}
            <View
              style={[
                styles.sheetHandle,
                {
                  backgroundColor: theme.colors.border,
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  marginBottom: theme.spacing(3)
                }
              ]}
            />
            
            <Text
              style={[
                styles.sheetTitle,
                {
                  color: theme.colors.text,
                  fontSize: theme.typography.subheading,
                  marginBottom: theme.spacing(2.5)
                }
              ]}
            >
              Add Context
            </Text>
            
            <TextInput
              multiline
              value={input}
              onChangeText={onChange}
              placeholder="Paste any link, transcription, or description…"
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.textInput,
                {
                  minHeight: 120,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing(2),
                  color: theme.colors.text,
                  backgroundColor: theme.colors.card,
                  fontSize: theme.typography.body,
                  lineHeight: theme.typography.body * theme.typography.lineHeight.normal
                }
              ]}
              textAlignVertical="top"
            />
            
            {errorMessage && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: theme.colors.danger + "20",
                    borderRadius: theme.radii.sm,
                    padding: theme.spacing(1.5),
                    marginTop: theme.spacing(2)
                  }
                ]}
              >
                <Text style={{ color: theme.colors.danger, fontSize: theme.typography.caption }}>
                  {errorMessage}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              onPress={onAnalyze}
              disabled={loading || !input.trim().length}
              activeOpacity={0.8}
              style={[
                styles.analyzeButton,
                {
                  borderRadius: theme.radii.pill,
                  paddingVertical: theme.spacing(2),
                  marginTop: theme.spacing(3),
                  backgroundColor:
                    loading || !input.trim().length
                      ? theme.colors.card
                      : theme.colors.primary,
                  opacity: loading || !input.trim().length ? 0.5 : 1
                }
              ]}
            >
              <Text
                style={[
                  styles.analyzeButtonText,
                  {
                    color: loading || !input.trim().length ? theme.colors.textTertiary : theme.colors.text,
                    fontSize: theme.typography.body,
                    fontWeight: "600"
                  }
                ]}
              >
                {loading ? "Analyzing..." : `Analyze • ${topic.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.cancelButton,
                {
                  paddingVertical: theme.spacing(1.5),
                  marginTop: theme.spacing(1.5)
                }
              ]}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.body
                  }
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    gap: 24
  },
  header: {
    marginBottom: 8
  },
  headerTitle: {
    letterSpacing: -0.5
  },
  mainCard: {
    marginBottom: 8
  },
  mainCardGradient: {
    width: "100%",
    minHeight: 140,
    position: "relative"
  },
  colorSpot: {
    overflow: "hidden"
  },
  mainCardContent: {
    padding: 24
  },
  mainCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  mainCardText: {
    flex: 1
  },
  mainCardTitle: {
    fontWeight: "600",
    letterSpacing: -0.5
  },
  mainCardSubtitle: {
    letterSpacing: 0.2
  },
  section: {
    marginTop: 8
  },
  sectionTitle: {
    fontWeight: "600"
  },
  analysesScrollContent: {
    paddingRight: 20
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheetCard: {
    // Styled inline
  },
  sheetHandle: {
    alignSelf: "center"
  },
  sheetTitle: {
    fontWeight: "600",
    letterSpacing: -0.3
  },
  textInput: {
    // Styled inline
  },
  errorContainer: {
    // Styled inline
  },
  analyzeButton: {
    alignItems: "center",
    justifyContent: "center"
  },
  analyzeButtonText: {
    letterSpacing: 0.2
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center"
  },
  cancelButtonText: {
    letterSpacing: 0.1
  }
});
