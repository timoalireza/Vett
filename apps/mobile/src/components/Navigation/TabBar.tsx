import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useVideoAnimationState } from "../Video/VideoAnimationProvider";

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { currentVideo } = useVideoAnimationState();
  const tabBarOpacity = useSharedValue(1);
  const tabBarTranslateY = useSharedValue(0);

  // Animate tab bar visibility based on loading state
  useEffect(() => {
    if (currentVideo === 'loading') {
      // Fade out and slide down
      tabBarOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      tabBarTranslateY.value = withTiming(20, { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      // Fade in and slide up
      tabBarOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      tabBarTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    }
  }, [currentVideo, tabBarOpacity, tabBarTranslateY]);

  const tabBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tabBarOpacity.value,
    transform: [{ translateY: tabBarTranslateY.value }],
  }));
  const id = React.useId();
  
  const tabs = [
    // `analyze` is the app's "home" route
    { key: "analyze", label: "Analyze", icon: "home-outline", activeIcon: "home" },
    { key: "collections", label: "History", icon: "time-outline", activeIcon: "time" },
    { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ] as const;

  return (
    <Animated.View 
      style={[styles.wrapper, tabBarAnimatedStyle]} 
      pointerEvents={currentVideo === 'loading' ? 'none' : 'auto'}
    >
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
            <View style={styles.iconContainer}>
              {isFocused && (
                <View style={styles.glow}>
                  <Svg height={50} width={50}>
                    <Defs>
                      <RadialGradient
                        id={`glow-${id}-${tab.key}`}
                        cx="50%"
                        cy="50%"
                        rx="50%"
                        ry="50%"
                      >
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={25} cy={25} r={25} fill={`url(#glow-${id}-${tab.key})`} />
                  </Svg>
                </View>
              )}
              <Ionicons
                name={isFocused ? (tab.activeIcon as any) : (tab.icon as any)}
                size={24}
                color={isFocused ? "#FFFFFF" : "#6B6B6B"}
              />
            </View>
          </Pressable>
        );
      })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#000000",
    paddingBottom: Platform.OS === "ios" ? 8 : 0,
  },
  container: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: Platform.OS === "ios" ? 34 : 24,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  glow: {
    position: "absolute",
    width: 50,
    height: 50,
    top: -5,
    left: -5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
