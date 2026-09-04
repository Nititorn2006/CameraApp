import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from "react-native";

type SettingsButtonProps = {
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SettingsButton({
  disabled = false,
  style,
}: SettingsButtonProps) {
  return (
    <Pressable
      accessibilityHint={
        disabled ? "Stop the current action before opening settings" : undefined
      }
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => router.push("/modal")}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <MaterialIcons color="#FFFFFF" name="settings" size={27} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "rgba(28, 28, 30, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.4,
  },
});
