import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  
  const tabs = [
    { key: "analyze", label: "Analyze", icon: "scan-outline", activeIcon: "scan" },
    { key: "collections", label: "History", icon: "layers-outline", activeIcon: "layers" },
    { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ] as const;

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        // Find corresponding route
        const route = state.routes.find((r) => r.name === tab.key);
        if (!route) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index].key === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <Pressable
            key={tab.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Ionicons
              name={isFocused ? (tab.activeIcon as any) : (tab.icon as any)}
              size={24}
              color={isFocused ? "#FFFFFF" : "#6B6B6B"}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? "#FFFFFF" : "#6B6B6B" },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingBottom: Platform.OS === "ios" ? 34 : 16, // Safe area padding
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
});
