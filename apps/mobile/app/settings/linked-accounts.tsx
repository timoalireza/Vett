import { useState, useEffect } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Platform, Alert, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTheme } from "../../src/hooks/use-theme";
import { GradientBackground } from "../../src/components/GradientBackground";
import { GlassCard } from "../../src/components/GlassCard";
import { getLinkedSocialAccounts, generateInstagramVerificationCode, linkInstagramAccount, unlinkInstagramAccount, type SocialAccount } from "../../src/api/social";
import { fetchSubscription } from "../../src/api/subscription";

export default function LinkedAccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["linkedSocialAccounts"],
    queryFn: getLinkedSocialAccounts
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription
  });

  const generateCodeMutation = useMutation({
    mutationFn: generateInstagramVerificationCode,
    onSuccess: (result) => {
      if (result.success && result.verificationCode) {
        Alert.alert(
          "Verification Code Generated",
          `Your verification code is: ${result.verificationCode}\n\nSend this code to @vettapp on Instagram to link your account.`,
          [
            { text: "OK", onPress: () => setShowCodeInput(true) }
          ]
        );
        setVerificationCode(result.verificationCode);
      } else {
        Alert.alert("Error", result.error || "Failed to generate verification code");
      }
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to generate verification code");
    }
  });

  const linkMutation = useMutation({
    mutationFn: linkInstagramAccount,
    onSuccess: (result) => {
      if (result.success) {
        Alert.alert("Success", "Verification code accepted! Your Instagram account should be linked shortly. Make sure you've sent the code to @vettapp on Instagram.");
        queryClient.invalidateQueries({ queryKey: ["linkedSocialAccounts"] });
        // Keep code input open so user can verify linking worked
      } else {
        Alert.alert("Error", result.error || "Failed to verify code");
      }
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to link Instagram account");
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkInstagramAccount,
    onSuccess: (result) => {
      if (result.success) {
        Alert.alert("Success", "Instagram account unlinked successfully.");
        queryClient.invalidateQueries({ queryKey: ["linkedSocialAccounts"] });
      } else {
        Alert.alert("Error", result.error || "Failed to unlink Instagram account");
      }
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to unlink Instagram account");
    }
  });

  const instagramAccount = accounts?.find((acc) => acc.platform === "INSTAGRAM");
  const isPro = subscription?.plan === "PRO";

  const handleLinkInstagram = () => {
    if (!isPro) {
      Alert.alert(
        "Pro Required",
        "Linking Instagram accounts is only available for Pro members. Upgrade to Pro to unlock unlimited analyses via Instagram DM!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/modals/subscription") }
        ]
      );
      return;
    }

    if (showCodeInput) {
      if (!verificationCode.trim()) {
        Alert.alert("Error", "Please enter a verification code");
        return;
      }
      linkMutation.mutate(verificationCode);
    } else {
      // Generate verification code
      generateCodeMutation.mutate();
    }
  };

  const handleUnlinkInstagram = () => {
    Alert.alert(
      "Unlink Instagram Account",
      "Are you sure you want to unlink your Instagram account? You'll lose access to unlimited analyses via DM.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: () => unlinkMutation.mutate()
        }
      ]
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.text,
                fontSize: theme.typography.heading,
                fontWeight: "700"
              }
            ]}
          >
            Linked Accounts
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: theme.spacing(2),
              paddingBottom: theme.spacing(6),
              gap: theme.spacing(2.5)
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Instagram Account */}
          <GlassCard
            style={{
              borderRadius: theme.radii.lg,
              padding: theme.spacing(2.5),
              gap: theme.spacing(1.5)
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(1.5), flex: 1 }}>
                <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: theme.typography.body
                    }}
                  >
                    Instagram
                  </Text>
                  {instagramAccount ? (
                    <Text style={{ color: theme.colors.subtitle, fontSize: theme.typography.caption }}>
                      Linked • Unlimited DM analyses
                    </Text>
                  ) : (
                    <Text style={{ color: theme.colors.subtitle, fontSize: theme.typography.caption }}>
                      {isPro ? "Link for unlimited DM analyses" : "Pro required"}
                    </Text>
                  )}
                </View>
              </View>
              {accountsLoading ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : instagramAccount ? (
                <TouchableOpacity
                  onPress={handleUnlinkInstagram}
                  disabled={unlinkMutation.isPending}
                  style={{
                    padding: theme.spacing(1),
                    borderRadius: theme.radii.md,
                    backgroundColor: "rgba(255, 59, 48, 0.2)"
                  }}
                >
                  <Text style={{ color: "#FF3B30", fontSize: theme.typography.caption, fontWeight: "600" }}>
                    Unlink
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleLinkInstagram}
                  disabled={linkMutation.isPending || generateCodeMutation.isPending || !isPro}
                  style={{
                    padding: theme.spacing(1),
                    borderRadius: theme.radii.md,
                    backgroundColor: isPro ? "rgba(59, 130, 246, 0.2)" : "rgba(128, 128, 128, 0.2)"
                  }}
                >
                  <Text
                    style={{
                      color: isPro ? "#3B82F6" : theme.colors.subtitle,
                      fontSize: theme.typography.caption,
                      fontWeight: "600"
                    }}
                  >
                    Link
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {showCodeInput && (
              <View style={{ marginTop: theme.spacing(2), gap: theme.spacing(1.5) }}>
                <TextInput
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter verification code"
                  placeholderTextColor={theme.colors.subtitle}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: theme.radii.md,
                    padding: theme.spacing(1.5),
                    color: theme.colors.text,
                    fontSize: theme.typography.body
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={{ flexDirection: "row", gap: theme.spacing(1) }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCodeInput(false);
                      setVerificationCode("");
                    }}
                    style={{
                      flex: 1,
                      padding: theme.spacing(1.5),
                      borderRadius: theme.radii.md,
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      alignItems: "center"
                    }}
                  >
                    <Text style={{ color: theme.colors.text }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleLinkInstagram}
                    disabled={linkMutation.isPending || !verificationCode.trim()}
                    style={{
                      flex: 1,
                      padding: theme.spacing(1.5),
                      borderRadius: theme.radii.md,
                      backgroundColor: linkMutation.isPending ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.2)",
                      alignItems: "center"
                    }}
                  >
                    {linkMutation.isPending ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <Text style={{ color: "#3B82F6", fontWeight: "600" }}>Link</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Info Card */}
          <GlassCard
            style={{
              borderRadius: theme.radii.lg,
              padding: theme.spacing(2.5),
              gap: theme.spacing(1),
              backgroundColor: "rgba(59, 130, 246, 0.1)"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(1.5) }}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: theme.typography.caption,
                    marginBottom: theme.spacing(0.5)
                  }}
                >
                  About Instagram Linking
                </Text>
                <Text style={{ color: theme.colors.subtitle, fontSize: theme.typography.caption, lineHeight: 18 }}>
                  Link your Instagram account to get unlimited fact-checking analyses via direct message. Send any post,
                  link, or image to @vettapp on Instagram and receive instant analysis results!
                </Text>
              </View>
      </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 12
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    letterSpacing: -0.5
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20
  }
});
