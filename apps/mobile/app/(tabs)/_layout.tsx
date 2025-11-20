import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../../src/hooks/use-theme";

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 16,
          paddingTop: 8,
          elevation: 0
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === "ios" ? 80 : 60}
            tint="dark"
            style={StyleSheet.absoluteFill}
          >
            <LinearGradient
              colors={[
                theme.colors.surface + "F0",
                theme.colors.surface + "E0"
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle top border */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: theme.colors.borderLight
              }}
            />
          </BlurView>
        ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 0.2,
          marginTop: -4
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            analyze: "scan-outline",
            collections: "layers-outline",
            profile: "person-outline"
          };
          
          // Add subtle glow effect for active tab
          return (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              {focused && (
                <View
                  style={{
                    position: "absolute",
                    width: size + 8,
                    height: size + 8,
                    borderRadius: (size + 8) / 2,
                    backgroundColor: theme.colors.primary + "20",
                    opacity: 0.6
                  }}
                />
              )}
              <Ionicons name={icons[route.name]} size={size} color={color} />
            </View>
          );
        }
      })}
    >
      <Tabs.Screen name="analyze" options={{ title: "Analyze" }} />
      <Tabs.Screen name="collections" options={{ title: "History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

