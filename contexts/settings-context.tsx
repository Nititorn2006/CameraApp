import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type PhotoResolution = "low" | "medium" | "high";
export type AudioQuality = "low" | "medium" | "high";

export type AppSettings = {
  countdownSeconds: number;
  shakeThresholdPercent: number;
  photoResolution: PhotoResolution;
  audioQuality: AudioQuality;
};

type SettingsContextValue = {
  isHydrated: boolean;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
};

const STORAGE_KEY = "@camera-app/settings";

const DEFAULT_SETTINGS: AppSettings = {
  countdownSeconds: 3,
  shakeThresholdPercent: 50,
  photoResolution: "high",
  audioQuality: "high",
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function getStoredSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_SETTINGS;
  }

  const stored = value as Partial<AppSettings>;

  const countdownSeconds =
    typeof stored.countdownSeconds === "number" &&
    Number.isInteger(stored.countdownSeconds) &&
    stored.countdownSeconds >= 3 &&
    stored.countdownSeconds <= 10
      ? stored.countdownSeconds
      : DEFAULT_SETTINGS.countdownSeconds;

  const shakeThresholdPercent =
    typeof stored.shakeThresholdPercent === "number" &&
    Number.isInteger(stored.shakeThresholdPercent) &&
    stored.shakeThresholdPercent >= 0 &&
    stored.shakeThresholdPercent <= 100
      ? stored.shakeThresholdPercent
      : DEFAULT_SETTINGS.shakeThresholdPercent;

  const photoResolution =
    stored.photoResolution === "low" ||
    stored.photoResolution === "medium" ||
    stored.photoResolution === "high"
      ? stored.photoResolution
      : DEFAULT_SETTINGS.photoResolution;

  const audioQuality =
    stored.audioQuality === "low" ||
    stored.audioQuality === "medium" ||
    stored.audioQuality === "high"
      ? stored.audioQuality
      : DEFAULT_SETTINGS.audioQuality;

  return {
    countdownSeconds,
    shakeThresholdPercent,
    photoResolution,
    audioQuality,
  };
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const changedBeforeLoadRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

        if (!storedValue || !isMounted || changedBeforeLoadRef.current) {
          return;
        }

        const nextSettings = getStoredSettings(JSON.parse(storedValue));

        settingsRef.current = nextSettings;
        setSettings(nextSettings);
      } catch (error) {
        console.warn("Unable to load settings:", error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    const nextSettings = getStoredSettings({
      ...settingsRef.current,
      ...updates,
    });

    if (
      nextSettings.countdownSeconds === settingsRef.current.countdownSeconds &&
      nextSettings.shakeThresholdPercent ===
        settingsRef.current.shakeThresholdPercent &&
      nextSettings.photoResolution === settingsRef.current.photoResolution &&
      nextSettings.audioQuality === settingsRef.current.audioQuality
    ) {
      return;
    }

    changedBeforeLoadRef.current = true;
    settingsRef.current = nextSettings;
    setSettings(nextSettings);

    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextSettings)
    ).catch((error) => {
      console.warn("Unable to save settings:", error);
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{ isHydrated, settings, updateSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }

  return context;
}