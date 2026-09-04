import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import {
  type AudioQuality,
  type PhotoResolution,
  useSettings,
} from "@/contexts/settings-context";

type SettingDropdownProps<T extends string> = {
  value: T;
  options: T[];
  labels: Record<T, string>;
  onValueChange: (value: T) => void;
};

function SettingDropdown<T extends string>({
    value,
    options,
    labels,
    onValueChange,
}: SettingDropdownProps<T>) {
    const [isOpen, setIsOpen] = useState(false);

    const otherOptions =
        options.filter(option => option !== value);

    return (
        <View style={styles.dropdownContainer}>
            <Pressable
                style={styles.dropdownButton}
                onPress={() => setIsOpen(current => !current)}
            >
                <Text style={styles.dropdownButtonText}>
                    {labels[value]}
                </Text>

                <MaterialIcons
                    name={
                        isOpen
                            ? "keyboard-arrow-up"
                            : "keyboard-arrow-down"
                    }
                    size={28}
                    color="white"
                />
            </Pressable>

            {isOpen && (
                <View style={styles.dropdownMenu}>
                    {otherOptions.map(option => (
                        <Pressable
                            key={option}
                            style={styles.dropdownItem}
                            onPress={() => {
                                onValueChange(option);
                                setIsOpen(false);
                            }}
                        >
                            <Text style={styles.dropdownItemText}>
                                {labels[option]}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

const COUNTDOWN_MIN = 3;
const COUNTDOWN_MAX = 10;
const SHAKE_THRESHOLD_MIN = 0;
const SHAKE_THRESHOLD_MAX = 100;
const PHOTO_LEVELS: PhotoResolution[] = ["low", "medium", "high"];
const AUDIO_LEVELS: AudioQuality[] = ["low", "medium", "high"];

const LEVEL_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

type SettingSliderProps = {
  accessibilityLabel: string;
  description: string;
  maximumLabel: string;
  maximumValue: number;
  minimumLabel: string;
  minimumValue: number;
  onValueChange: (value: number) => void;
  title: string;
  value: number;
  valueLabel: string;
};

function SettingSlider({
  accessibilityLabel,
  description,
  maximumLabel,
  maximumValue,
  minimumLabel,
  minimumValue,
  onValueChange,
  title,
  value,
  valueLabel,
}: SettingSliderProps) {
  return (
    <View style={styles.card}>
      <View style={styles.settingHeader}>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>

        <View style={styles.valueBadge}>
          <Text style={styles.valueBadgeText}>{valueLabel}</Text>
        </View>
      </View>

      <Slider
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          max: maximumValue,
          min: minimumValue,
          now: value,
          text: valueLabel,
        }}
        maximumTrackTintColor="#3A3A40"
        maximumValue={maximumValue}
        minimumTrackTintColor="#FF4248"
        minimumValue={minimumValue}
        onValueChange={onValueChange}
        step={1}
        style={styles.slider}
        thumbTintColor="#FFFFFF"
        value={value}
      />

      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{minimumLabel}</Text>
        <Text style={styles.rangeLabel}>{maximumLabel}</Text>
      </View>
    </View>
  );
}

function SettingsHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerSpacer} />

      <Text style={styles.headerTitle}>Settings</Text>

      <Pressable
        accessibilityLabel="Close settings"
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.doneButton,
          pressed && styles.doneButtonPressed,
        ]}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const { isHydrated, settings, updateSettings } = useSettings();

  if (!isHydrated) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <SettingsHeader />

        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF4248" size="large" />
          <Text style={styles.loadingText}>Loading settings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <SettingsHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeading}>
          <MaterialIcons color="#A8A8AD" name="photo-camera" size={20} />
          <Text style={styles.sectionTitle}>Camera</Text>
        </View>

        <Text style={styles.groupLabel}>SHAKE COUNTDOWN</Text>
        <SettingSlider
          accessibilityLabel="Shake countdown seconds"
          description="Time before a photo is taken after you shake the phone"
          maximumLabel="10 sec"
          maximumValue={COUNTDOWN_MAX}
          minimumLabel="3 sec"
          minimumValue={COUNTDOWN_MIN}
          onValueChange={(value) =>
            updateSettings({ countdownSeconds: Math.round(value) })
          }
          title="Countdown"
          value={settings.countdownSeconds}
          valueLabel={`${settings.countdownSeconds} sec`}
        />

        <Text style={styles.groupLabel}>SHAKE THRESHOLD</Text>
        <SettingSlider
          accessibilityLabel="Shake threshold percentage"
          description="How hard the phone must be shaken before countdown starts"
          maximumLabel="100%"
          maximumValue={SHAKE_THRESHOLD_MAX}
          minimumLabel="0%"
          minimumValue={SHAKE_THRESHOLD_MIN}
          onValueChange={(value) =>
            updateSettings({ shakeThresholdPercent: Math.round(value) })
          }
          title="Shake Threshold"
          value={settings.shakeThresholdPercent}
          valueLabel={`${settings.shakeThresholdPercent}%`}
        />

        <Text style={styles.groupLabel}>PHOTO RESOLUTION</Text>

        <SettingDropdown
          value={settings.photoResolution}
          options={PHOTO_LEVELS}
          labels={LEVEL_LABELS}
          onValueChange={(resolution) => {
          updateSettings({
          photoResolution: resolution,
            });
          }}
        />
        <View style={[styles.sectionHeading, styles.voiceSectionHeading]}>
          <MaterialIcons color="#A8A8AD" name="mic" size={20} />
          <Text style={styles.sectionTitle}>Voice Recorder</Text>
        </View>

        <Text style={styles.groupLabel}>
    AUDIO QUALITY
</Text>

<SettingDropdown
    value={settings.audioQuality}
    options={AUDIO_LEVELS}
    labels={LEVEL_LABELS}
    onValueChange={(quality) => {
        updateSettings({
            audioQuality: quality,
        });
    }}
/>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "#202024",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  headerSpacer: {
    width: 56,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  doneButton: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 44,
    width: 56,
  },
  doneButtonPressed: {
    opacity: 0.55,
  },
  doneButtonText: {
    color: "#FF4248",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
  },
  loadingText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  voiceSectionHeading: {
    marginTop: 30,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  groupLabel: {
    color: "#77777E",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 22,
  },
  card: {
    backgroundColor: "#18181B",
    borderColor: "#28282C",
    borderRadius: 18,
    borderWidth: 1,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  settingHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  settingDescription: {
    color: "#8E8E93",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  valueBadge: {
    alignItems: "center",
    backgroundColor: "#302124",
    borderColor: "#693136",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 34,
    justifyContent: "center",
    minWidth: 68,
    paddingHorizontal: 10,
  },
  valueBadgeText: {
    color: "#FF7377",
    fontSize: 14,
    fontWeight: "800",
  },
  slider: {
    height: 44,
    marginHorizontal: -4,
    marginTop: 10,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
  },
  rangeLabel: {
    color: "#77777E",
    fontSize: 12,
    fontWeight: "600",
  },
  dropdownContainer: {
    marginBottom: 20,
},

dropdownButton: {
    alignItems: "center",
    backgroundColor: "#18181B",
    borderColor: "#444",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 18,
},

dropdownButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
},

dropdownMenu: {
    backgroundColor: "#18181B",
    borderColor: "#444",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
},

dropdownItem: {
    borderBottomColor: "#333",
    borderBottomWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
},

dropdownItemText: {
    color: "#FFFFFF",
    fontSize: 17,
},
});
