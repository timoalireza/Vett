import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { TabBar } from "../../src/components/Navigation/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="analyze" />
      <Tabs.Screen name="collections" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

