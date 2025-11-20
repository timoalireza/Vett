import { Component, ErrorInfo, ReactNode } from "react";
import { Text, View } from "react-native";

import { theme } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class CrashBoundary extends Component<Props, State> {
  state: State = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("Crash boundary captured error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            alignItems: "center",
            justifyContent: "center",
            padding: 24
          }}
        >
          <Text style={{ color: theme.colors.text, fontSize: 22 }}>We hit a snag</Text>
          <Text style={{ color: theme.colors.subtitle, marginTop: 8, textAlign: "center" }}>
            Your draft is safe. Try again in a moment.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

