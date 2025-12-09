import React, { useRef, useEffect } from "react";
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
} from "react-native";

interface ClaimInputProps extends TextInputProps {
  onPaste?: (text: string) => void;
  isFocused?: boolean;
  onRequestFocus?: () => void;
}

export const ClaimInput: React.FC<ClaimInputProps> = ({
  onPaste,
  isFocused,
  onRequestFocus,
  style,
  ...props
}) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          { color: "#E5E5E5" }, // Primary color
          style,
        ]}
        placeholder="Paste a claim..."
        placeholderTextColor="#4A4A4A" // Muted color
        multiline
        selectionColor="#FFFFFF" // White accent color for selection
        cursorColor="#FFFFFF" // White cursor color
        autoCapitalize="sentences"
        autoCorrect
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  input: {
    fontFamily: "Inter_300Light",
    fontSize: 18,
    textAlign: "center",
    minWidth: 200,
    padding: 10,
    // Minimal styling - invisible background
  },
});
