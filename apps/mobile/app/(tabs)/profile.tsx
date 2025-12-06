import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { LensMotif } from "../../src/components/Lens/LensMotif";
import { SettingsRow } from "../../src/components/Common/SettingsRow";

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/signin");
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User section */}
        <View style={styles.userSection}>
          <LensMotif size={64} />
          <Text style={styles.userEmail}>
            {user?.primaryEmailAddress?.emailAddress || "user@vett.app"}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings list */}
        <View style={styles.settingsList}>
          <SettingsRow 
            icon="settings-outline" 
            label="Settings" 
            onPress={() => router.push("/settings")} 
          />
          <SettingsRow 
            icon="notifications-outline" 
            label="Notifications" 
            onPress={() => router.push("/settings/notifications")} 
          />
          <SettingsRow 
            icon="color-palette-outline" 
            label="Appearance" 
            onPress={() => {}} 
            value="Dark"
          />
          <SettingsRow 
            icon="help-circle-outline" 
            label="Help & Support" 
            onPress={() => Linking.openURL("mailto:support@vett.app")} 
          />
          <SettingsRow 
            icon="document-text-outline" 
            label="Terms & Privacy" 
            onPress={() => router.push("/settings/terms")} 
          />
        </View>

        {/* Sign out */}
        <View style={styles.signOutContainer}>
          <Pressable onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontFamily: "Inter_200ExtraLight",
    fontSize: 28,
    color: "#FFFFFF",
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  userEmail: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#E5E5E5",
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 16,
  },
  settingsList: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  signOutContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  signOutButton: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    paddingVertical: 16,
    alignItems: "center",
  },
  signOutText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#EF4444",
  },
});
