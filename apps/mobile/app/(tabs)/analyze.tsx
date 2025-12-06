import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useShareIntent } from "expo-share-intent";

import { tokenProvider } from "../../src/api/token-provider";
import { submitAnalysis } from "../../src/api/analysis";
import { useTheme } from "../../src/hooks/use-theme";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { AnimatedLens } from "../../src/components/Lens/AnimatedLens";
import { ClaimInput } from "../../src/components/Input/ClaimInput";
import { useLensState } from "../../src/hooks/useLensState";

export default function AnalyzeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();
  const params = useLocalSearchParams<{ openSheet?: string }>();
  
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const { state: lensState, toInput, toLoading, reset } = useLensState();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [permissionStatus, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  // Reset state on focus
  useFocusEffect(
    useCallback(() => {
      reset();
      setInput("");
      setSelectedImage(null);
      setIsInputFocused(false);
    }, [reset])
  );

  // Update token provider
  useEffect(() => {
    const updateToken = async () => {
      if (isSignedIn && getToken) {
        try {
          const token = await getToken();
          tokenProvider.setToken(token);
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

  // Handle Share Intent
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      let handled = false;
      if (shareIntent.webUrl || shareIntent.text || (shareIntent as any).url) {
        const content = shareIntent.webUrl || shareIntent.text || (shareIntent as any).url;
        if (content && typeof content === "string") {
          setInput(content);
          toInput();
          setIsInputFocused(true);
          handled = true;
        }
      } else if (shareIntent.files && shareIntent.files.length > 0) {
        const file = shareIntent.files[0];
        const uri = file.path || (file as any).contentUri || (file as any).uri;
        if (uri && typeof uri === "string") {
          setSelectedImage(uri);
          toInput();
          handled = true;
        }
      }
      
      if (!handled) {
        Alert.alert("Unsupported Content", "The shared content could not be processed.");
      }
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, toInput, resetShareIntent]);

  // Submit Mutation
  const mutation = useMutation({
    mutationFn: async (data: { text?: string; imageUri?: string }) => {
      const mediaType = data.imageUri ? "IMAGE" : "TEXT";
      return await submitAnalysis({
        text: data.text,
        contentUri: data.imageUri,
        mediaType,
      });
    },
    onMutate: () => {
      toLoading();
    },
    onSuccess: (data) => {
      console.log("[Analyze] Submission success, job ID:", data.analysisId);
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      router.push(`/result/${data.analysisId}`);
    },
    onError: (error: any) => {
      console.error("[Analyze] Submission error:", error);
      Alert.alert("Error", "Failed to submit analysis. Please try again.");
      reset();
    },
  });

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !selectedImage) return;
    
    Keyboard.dismiss();
    setIsInputFocused(false);
    mutation.mutate({
      text: trimmedInput || undefined,
      imageUri: selectedImage || undefined,
    });
  };

  const pickImage = async () => {
    if (permissionStatus?.status !== ImagePicker.PermissionStatus.GRANTED) {
      const permission = await requestPermission();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow access to your photos to upload images.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      toInput();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => {
        Keyboard.dismiss();
        setIsInputFocused(false);
        if (!input && !selectedImage) reset();
      }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.lensContainer}>
            <View style={{ width: 360, height: 360, alignItems: 'center', justifyContent: 'center' }}>
              {lensState === "loading" ? (
                <AnimatedLens size={360} />
              ) : (
                <LensMotif size={360} />
              )}
              
              {/* Overlay Content */}
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}>
                {lensState === "loading" ? (
                  <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>
                    <Text style={styles.loadingText}>Analyzing claim...</Text>
                    {input ? (
                      <Text style={styles.claimPreview} numberOfLines={2}>
                        "{input}"
                      </Text>
                    ) : selectedImage ? (
                      <Text style={styles.claimPreview}>Analyzing image...</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    {isInputFocused || input || selectedImage ? (
                      <View style={{ width: "100%", alignItems: "center" }}>
                        <ClaimInput
                          value={input}
                          onChangeText={(text) => setInput(text)}
                          onSubmitEditing={handleSubmit}
                          returnKeyType="go"
                          isFocused={isInputFocused}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          placeholder="Paste a claim..."
                          style={{ marginTop: 0, color: "#FFFFFF", textAlign: "center" }}
                          placeholderTextColor="rgba(255,255,255,0.5)"
                        />
                        {selectedImage && (
                          <View style={styles.imagePreview}>
                            <Text style={styles.imageText}>Image Selected</Text>
                            <TouchableOpacity onPress={() => setSelectedImage(null)}>
                              <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                        <TouchableOpacity 
                          onPress={handleSubmit} 
                          style={[styles.submitButton, mutation.isPending && { opacity: 0.5 }]}
                          disabled={mutation.isPending}
                        >
                          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => {
                        setIsInputFocused(true);
                        toInput();
                      }}>
                        <Text style={styles.promptText}>
                          Paste a claim to verify
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons (Image, etc) - visible when not loading */}
          {lensState !== "loading" && !isInputFocused && !input && !selectedImage && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={pickImage} style={styles.actionIcon}>
                <Ionicons name="image-outline" size={24} color="#6B6B6B" />
              </TouchableOpacity>
            </View>
          )}

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100, // Visual offset
  },
  lensContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  promptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#E5E5E5",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#E5E5E5",
    marginBottom: 8,
  },
  claimPreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#A0A0A0",
    maxWidth: 240,
    textAlign: "center",
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 20,
    marginTop: 10,
    gap: 8,
  },
  imageText: {
    color: "#E5E5E5",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  submitButton: {
    marginTop: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    position: "absolute",
    bottom: 40,
  },
  actionIcon: {
    padding: 12,
  },
});
