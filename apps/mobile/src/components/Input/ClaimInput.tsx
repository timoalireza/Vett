import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
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

export interface ClaimInputRef {
  focus: () => void;
  blur: () => void;
}

export const ClaimInput = forwardRef<ClaimInputRef, ClaimInputProps>(({
  onPaste,
  isFocused,
  onRequestFocus,
  style,
  ...props
}, ref) => {
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

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
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 18,
    textAlign: "center",
    minWidth: 200,
    padding: 10,
    // Minimal styling - invisible background
  },
});
