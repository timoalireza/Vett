import { useMemo, useState, useEffect, useCallback } from "react";
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
  Linking,
  Image,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@clerk/clerk-expo";
import { tokenProvider } from "../../src/api/token-provider";

// Conditional import for expo-image-picker to handle missing native module
let ImagePicker: typeof import("expo-image-picker") | null = null;
try {
  ImagePicker = require("expo-image-picker");
} catch (error) {
  console.warn("expo-image-picker not available:", error);
}

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { AnalysisCardVertical } from "../../src/components/AnalysisCardVertical";
import { submitAnalysis, fetchAnalyses } from "../../src/api/analysis";
import { useQuery } from "@tanstack/react-query";

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();
  const params = useLocalSearchParams<{ openSheet?: string }>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Open sheet when navigating from history page
  useEffect(() => {
    if (params.openSheet === "true") {
      setSheetVisible(true);
      // Clear the param to avoid reopening on re-render
      router.setParams({ openSheet: undefined });
    }
  }, [params.openSheet, router]);

  // Update token provider when auth state changes
  useEffect(() => {
    const updateToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken();
          tokenProvider.setToken(token);
          console.log("[Analyze] Token set in provider:", !!token);
        } catch (error) {
          console.error("[Analyze] Error getting token:", error);
          tokenProvider.setToken(null);
        }
      } else {
        tokenProvider.setToken(null);
      }
    };
    updateToken();
  }, [isSignedIn, getToken]);
  
  // Fetch user's recent analyses
  const { data: analysesData, refetch: refetchAnalyses, error: analysesError, isLoading: analysesLoading } = useQuery({
    queryKey: ["analyses", "recent"],
    queryFn: async () => {
      try {
        const result = await fetchAnalyses(10);
        console.log("[Analyze] Fetched analyses:", result?.edges?.length || 0, "analyses");
        console.log("[Analyze] Analyses data:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("[Analyze] Error fetching analyses:", error);
        throw error;
      }
    },
    enabled: isSignedIn ?? false, // Only fetch when user is authenticated
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true // Refetch when screen comes into focus
  });

  // Log authentication and query state
  useEffect(() => {
    console.log("[Analyze] Auth state:", { isSignedIn, analysesLoading, error: analysesError?.message });
    if (analysesData) {
      console.log("[Analyze] Analyses count:", analysesData?.edges?.length || 0);
    }
  }, [isSignedIn, analysesData, analysesLoading, analysesError]);

  // Refetch analyses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        // Small delay to ensure backend has processed any new analyses
        setTimeout(() => {
          refetchAnalyses();
          queryClient.invalidateQueries({ queryKey: ["analyses"] });
        }, 500);
      }
    }, [isSignedIn, refetchAnalyses, queryClient])
  );

  const recentAnalyses = useMemo(() => {
    if (!analysesData?.edges) return [];
    return analysesData.edges
      .filter((edge) => edge.node.status === "COMPLETED")
      .slice(0, 5)
      .map((edge) => {
        const node = edge.node;
        // Map bias to topic (bias values: LEFT, CENTER, RIGHT -> map to political)
        // Or use a default topic based on analysis content
        let topic = "general";
        if (node.bias) {
          topic = "political"; // Bias indicates political analysis
        }
        return {
          id: node.id,
          title: node.summary?.substring(0, 50) || "Analysis",
          topic: topic,
          score: node.score ?? 0,
          imageUrl: node.imageUrl || null,
          imageAttribution: {
            photographer: "",
            photographerProfileUrl: "",
            unsplashPhotoUrl: "",
            isGenerated: false
          }
        };
      });
  }, [analysesData]);

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
        contentUri: selectedImage,
        mediaType: selectedImage ? "IMAGE" : "TEXT",
        topicHint: placeholderTopic.toUpperCase()
      }),
    onSuccess: ({ analysisId }) => {
      // Clear input and close sheet first
      setSheetVisible(false);
      setErrorMessage(null);
      setInput("");
      setSelectedImage(null);
      
      // Invalidate queries immediately
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      
      // Navigate to result page
      router.push({
        pathname: `/result/${analysisId}`
      });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    }
  });

  const handleAnalyze = () => {
    // Validation should match button enablement logic: require either text OR image
    if (!input.trim().length && !selectedImage) {
      setErrorMessage("Please paste a link, description, or select an image before analyzing.");
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
        <View style={[styles.header, { marginBottom: theme.spacing(1) }]}>
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

        {/* Pro Tier Card */}
        <TouchableOpacity
          onPress={() => router.push("/modals/subscription")}
          activeOpacity={0.9}
          style={styles.proTierCard}
        >
          <LinearGradient
            colors={["#5A8FD4", "#8A7FA8", "#FFB88C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.proTierGradient,
              {
                borderRadius: theme.radii.lg,
                overflow: "hidden",
                padding: theme.spacing(3)
              }
            ]}
          >
            <View style={styles.proTierContent}>
              <View style={styles.proTierLeft}>
                <Text
                  style={[
                    styles.proTierTitle,
                    {
                      color: "#FFFFFF",
                      fontSize: theme.typography.heading,
                      fontWeight: "700",
                      letterSpacing: -0.5,
                      marginBottom: theme.spacing(1)
                    }
                  ]}
                >
                  Unlimited Analyses
                </Text>
                <Text
                  style={[
                    styles.proTierDescription,
                    {
                      color: "rgba(255, 255, 255, 0.9)",
                      fontSize: theme.typography.body,
                      lineHeight: theme.typography.body * theme.typography.lineHeight.relaxed,
                      marginBottom: theme.spacing(2)
                    }
                  ]}
                >
                  Get unlimited fact-checks, advanced bias analysis, and priority processing
                </Text>
                <Text
                  style={[
                    styles.proTierPrice,
                    {
                      color: "#FFFFFF",
                      fontSize: theme.typography.body,
                      fontWeight: "600"
                    }
                  ]}
                >
                  Try Pro for $6.99/month
                </Text>
              </View>
              <View
                style={[
                  styles.proTierBadge,
                  {
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: theme.radii.md,
                    paddingHorizontal: theme.spacing(2),
                    paddingVertical: theme.spacing(1),
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.3)"
                  }
                ]}
              >
                <Text
                  style={[
                    styles.proTierBadgeText,
                    {
                      color: "#FFFFFF",
                      fontSize: theme.typography.caption,
                      fontWeight: "600",
                      letterSpacing: 0.5
                    }
                  ]}
                >
                  Vett Pro
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="rgba(255, 255, 255, 0.8)"
              style={styles.proTierChevron}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent analyses vertical list */}
        {recentAnalyses.length > 0 && (
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
            <View style={styles.analysesList}>
              {recentAnalyses.map((analysis) => (
                <AnalysisCardVertical
                  key={analysis.id}
                  id={analysis.id}
                  title={analysis.title}
                  score={analysis.score}
                  topic={analysis.topic}
                  imageUrl={analysis.imageUrl}
                  imageAttribution={analysis.imageAttribution}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Analysis input sheet */}
      <AnalyzeSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSelectedImage(null);
          setInput("");
        }}
        input={input}
        onChange={setInput}
        onAnalyze={handleAnalyze}
        topic={placeholderTopic}
        loading={submitMutation.isPending}
        errorMessage={errorMessage}
        selectedImage={selectedImage}
        onImageSelect={setSelectedImage}
        onImageRemove={() => setSelectedImage(null)}
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
  selectedImage: string | null;
  onImageSelect: (uri: string | null) => void;
  onImageRemove: () => void;
}

function AnalyzeSheet({ 
  visible, 
  onClose, 
  input, 
  onChange, 
  onAnalyze, 
  topic, 
  loading, 
  errorMessage,
  selectedImage,
  onImageSelect,
  onImageRemove
}: SheetProps) {
  const theme = useTheme();

  const requestImagePermissions = async () => {
    if (!ImagePicker) {
      Alert.alert("Not Available", "Image picker is not available. Please rebuild the app.");
      return false;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to analyze images."
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (!ImagePicker) {
      Alert.alert("Not Available", "Image picker is not available. Please rebuild the app.");
      return;
    }
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    if (!ImagePicker) {
      Alert.alert("Not Available", "Image picker is not available. Please rebuild the app.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your camera to take photos."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelect(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageOptions = () => {
    if (!ImagePicker) {
      Alert.alert("Not Available", "Image picker is not available. Please rebuild the app.");
      return;
    }
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        { text: "Camera", onPress: takePhoto },
        { text: "Photo Library", onPress: pickImage },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };
  
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
            style={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              padding: theme.spacing(3)
            }}
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
            
            {/* Image Input Section */}
            <View style={{ marginBottom: theme.spacing(2) }}>
              {selectedImage ? (
                <View style={{ position: "relative", marginBottom: theme.spacing(2) }}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: theme.radii.md,
                      resizeMode: "cover"
                    }}
                  />
                  <TouchableOpacity
                    onPress={onImageRemove}
                    style={{
                      position: "absolute",
                      top: theme.spacing(1),
                      right: theme.spacing(1),
                      backgroundColor: theme.colors.danger,
                      borderRadius: theme.radii.pill,
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : ImagePicker ? (
                <TouchableOpacity
                  onPress={showImageOptions}
                  style={[
                    {
                      borderRadius: theme.radii.md,
                      borderWidth: 2,
                      borderColor: theme.colors.border,
                      borderStyle: "dashed",
                      padding: theme.spacing(3),
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.colors.card,
                      marginBottom: theme.spacing(2)
                    }
                  ]}
                >
                  <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.body,
                        marginTop: theme.spacing(1)
                      }
                    ]}
                  >
                    Add Image (Optional)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TextInput
              multiline
              value={input}
              onChangeText={onChange}
              placeholder={selectedImage ? "Add description or context (optional)…" : "Paste any link, transcription, or description…"}
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.textInput,
                {
                  minHeight: selectedImage ? 80 : 120,
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
              disabled={loading || (!input.trim().length && !selectedImage)}
              activeOpacity={0.8}
              style={[
                styles.analyzeButton,
                {
                  borderRadius: theme.radii.pill,
                  paddingVertical: theme.spacing(2),
                  marginTop: theme.spacing(3),
                  backgroundColor:
                    loading || (!input.trim().length && !selectedImage)
                      ? theme.colors.card
                      : theme.colors.primary,
                  opacity: loading || (!input.trim().length && !selectedImage) ? 0.5 : 1
                }
              ]}
            >
              <Text
                style={[
                  styles.analyzeButtonText,
                  {
                    color: loading || (!input.trim().length && !selectedImage) ? theme.colors.textTertiary : theme.colors.text,
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
  analysesList: {
    gap: 16
  },
  proTierCard: {
    marginBottom: 16
  },
  proTierGradient: {
    position: "relative"
  },
  proTierContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  proTierLeft: {
    flex: 1,
    marginRight: 16
  },
  proTierTitle: {
    letterSpacing: -0.3
  },
  proTierDescription: {
    letterSpacing: 0.1
  },
  proTierPrice: {
    letterSpacing: 0.2
  },
  proTierBadge: {
    alignSelf: "flex-start"
  },
  proTierBadgeText: {
    textTransform: "uppercase"
  },
  proTierChevron: {
    position: "absolute",
    bottom: 24,
    right: 24
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end"
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
