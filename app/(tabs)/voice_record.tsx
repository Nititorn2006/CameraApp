import {
    Alert,
    BackHandler,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";
import {
    useIsFocused,
    usePreventRemove,
} from "@react-navigation/native";

import {
    AudioQuality,
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { SettingsButton } from "@/components/settings-button";
import { useSettings } from "@/contexts/settings-context";

const LOW_QUALITY_RECORDING_OPTIONS = {
    ...RecordingPresets.HIGH_QUALITY,
    bitRate: 64000,
    ios: {
        ...RecordingPresets.HIGH_QUALITY.ios,
        audioQuality: AudioQuality.LOW,
    },
    web: {
        ...RecordingPresets.HIGH_QUALITY.web,
        bitsPerSecond: 64000,
    },
};

type RecorderPhase =
    | "idle"
    | "starting"
    | "recording"
    | "stopping";

export default function HomeScreen() {
    const isFocused = useIsFocused();
    const { isHydrated, settings } = useSettings();

    const recorder =
        useAudioRecorder(
            settings.audioQuality === "high"
                ? RecordingPresets.HIGH_QUALITY
                : LOW_QUALITY_RECORDING_OPTIONS
        );

    const recorderState =
        useAudioRecorderState(recorder);

    const [recordingUri, setRecordingUri] =
        useState<string | null>(null);

    const [recorderPhase, setRecorderPhase] =
        useState<RecorderPhase>("idle");

    const recorderPhaseRef =
        useRef<RecorderPhase>("idle");

    const isFocusedRef =
        useRef(isFocused);

    const recordingIsActive =
        recorderPhase === "recording" ||
        recorderPhase === "stopping";

    const recorderIsBusy =
        recorderPhase !== "idle";

    usePreventRemove(recorderIsBusy, () => {
        Alert.alert(
            "Recording in progress",
            "Stop the recording before leaving this screen."
        );
    });

    useEffect(() => {
        const subscription =
            BackHandler.addEventListener(
                "hardwareBackPress",
                () => {
                    if (recorderPhaseRef.current === "idle") {
                        return false;
                    }

                    Alert.alert(
                        "Recording in progress",
                        "Stop the recording before leaving this screen."
                    );

                    return true;
                }
            );

        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        setupAudio();
    }, []);

    useEffect(() => {
        isFocusedRef.current = isFocused;
    }, [isFocused]);

    async function setupAudio() {
        const permission =
            await AudioModule.requestRecordingPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                "Permission required",
                "Please allow microphone access."
            );

            return;
        }

        await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
        });
    }

    const changeRecorderPhase =
        useCallback((nextPhase: RecorderPhase) => {
            recorderPhaseRef.current = nextPhase;
            setRecorderPhase(nextPhase);
        }, []);

    async function startRecording() {
        if (
            !isHydrated ||
            recorderPhaseRef.current !== "idle"
        ) {
            return;
        }

        changeRecorderPhase("starting");

        try {
            setRecordingUri(null);

            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );

            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });

            await recorder.prepareToRecordAsync();

            if (!isFocusedRef.current) {
                recorder.record();
                await recorder.stop();
                changeRecorderPhase("idle");

                return;
            }

            recorder.record();
            setRecordingUri(null);
            changeRecorderPhase("recording");
        } catch (error) {
            console.log(error);

            changeRecorderPhase("idle");

            Alert.alert(
                "Error",
                "Cannot start recording."
            );
        }
    }

    const stopRecording =
        useCallback(async () => {
            if (recorderPhaseRef.current !== "recording") {
                return;
            }

            changeRecorderPhase("stopping");

            try {
                await recorder.stop();

                const uri =
                    recorder.uri;

                if (uri) {
                    setRecordingUri(uri);
                }

                changeRecorderPhase("idle");
            } catch (error) {
                console.log(error);

                changeRecorderPhase(
                    recorder.isRecording
                        ? "recording"
                        : "idle"
                );

                Alert.alert(
                    "Error",
                    "Cannot stop recording."
                );
            }
        }, [changeRecorderPhase, recorder]);

    useEffect(() => {
        if (
            !isFocused &&
            recorderPhaseRef.current === "recording"
        ) {
            void stopRecording();
        }
    }, [isFocused, stopRecording]);

    function formatTime(milliseconds: number) {
        const totalSeconds =
            Math.floor(milliseconds / 1000);

        const minutes =
            Math.floor(totalSeconds / 60);

        const seconds =
            totalSeconds % 60;

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0")
        );
    }

    function goBackToCamera() {
        if (recorderPhaseRef.current !== "idle") {
            Alert.alert(
                "Recording in progress",
                "Stop the recording before returning to the camera."
            );

            return;
        }

        if (router.canGoBack()) {
            router.back();

            return;
        }

        router.replace("/");
    }

    return (
        <SafeAreaView
            edges={["top", "bottom"]}
            style={styles.container}
        >
            <View style={styles.header}>
                <Pressable
                    accessibilityLabel="Back to camera"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: recorderIsBusy }}
                    disabled={recorderIsBusy}
                    hitSlop={10}
                    onPress={goBackToCamera}
                    style={({ pressed }) => [
                        styles.headerButton,
                        pressed && styles.headerButtonPressed,
                        recorderIsBusy && styles.headerButtonDisabled,
                    ]}
                >
                    <Text style={styles.backIcon}>‹</Text>
                </Pressable>

                <Text style={styles.title}>
                    Voice Recorder
                </Text>

                <SettingsButton
                    disabled={!isHydrated || recorderIsBusy}
                />
            </View>

            <View style={styles.recorderContainer}>
                {recordingIsActive && (
                    <>
                        <View style={styles.recordingIndicator}>
                            <View style={styles.redDot} />

                            <Text style={styles.recordingText}>
                                Recording
                            </Text>
                        </View>

                        <Text style={styles.timer}>
                            {formatTime(
                                recorderState.durationMillis
                            )}
                        </Text>
                    </>
                )}
            </View>

            {recordingUri &&
                !recordingIsActive && (
                    <RecordingPlayer
                        isFocused={isFocused}
                        uri={recordingUri}
                        onClear={() =>
                            setRecordingUri(null)
                        }
                    />
                )}

            <View style={styles.buttonContainer}>
                <Pressable
                    accessibilityLabel={
                        recorderPhase === "recording"
                            ? "Stop recording"
                            : "Start recording"
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                        disabled:
                            !isHydrated ||
                            recorderPhase === "starting" ||
                            recorderPhase === "stopping",
                    }}
                    disabled={
                        !isHydrated ||
                        recorderPhase === "starting" ||
                        recorderPhase === "stopping"
                    }
                    onPress={
                        recorderPhase === "recording"
                            ? stopRecording
                            : startRecording
                    }
                    style={({ pressed }) => [
                        styles.recordButtonOuter,
                        pressed &&
                            styles.recordButtonPressed,
                    ]}
                >
                    <View
                        style={[
                            styles.recordButtonInner,
                            recordingIsActive &&
                                styles.recordingButtonInner,
                        ]}
                    />
                </Pressable>

                <Text style={styles.buttonText}>
                    {!isHydrated
                        ? "Loading settings…"
                        : recorderPhase === "starting"
                          ? "Starting…"
                          : recorderPhase === "stopping"
                            ? "Saving…"
                            : recorderPhase === "recording"
                              ? "Tap to stop"
                              : `Tap to record · ${
settings.audioQuality === "high"
    ? "High"
    : "Low"
                              } quality`}
                </Text>
            </View>
        </SafeAreaView>
    );
}

type RecordingPlayerProps = {
    isFocused: boolean;
    uri: string;
    onClear: () => void;
};

function RecordingPlayer({
    isFocused,
    uri,
    onClear,
}: RecordingPlayerProps) {
    const player =
        useAudioPlayer(uri);

    const playerStatus =
        useAudioPlayerStatus(player);

    const isFocusedRef =
        useRef(isFocused);

    useEffect(() => {
        isFocusedRef.current = isFocused;

        if (!isFocused && playerStatus.playing) {
            try {
                player.pause();
            } catch (error) {
                console.warn(
                    "Unable to pause recording playback:",
                    error
                );
            }
        }
    }, [isFocused, player, playerStatus.playing]);

    async function togglePlayback() {
        try {
            if (playerStatus.playing) {
                player.pause();

                return;
            }

            await player.seekTo(0);

            if (!isFocusedRef.current) {
                return;
            }

            player.play();
        } catch (error) {
            console.log(error);

            Alert.alert(
                "Error",
                "Cannot play recording."
            );
        }
    }

    function clearRecording() {
        if (playerStatus.playing) {
            try {
                player.pause();
            } catch (error) {
                console.warn(
                    "Unable to pause recording playback:",
                    error
                );
            }
        }

        onClear();
    }

    return (
        <View style={styles.recordingCard}>
            <View>
                <Text style={styles.recordingTitle}>
                    Recording
                </Text>

                <Text style={styles.recordingInfo}>
                    Audio recording
                </Text>
            </View>

            <View style={styles.recordingActions}>
                <Pressable
                    style={styles.playButton}
                    onPress={togglePlayback}
                >
                    <Text style={styles.playButtonText}>
                        {playerStatus.playing
                            ? "Pause"
                            : "Play"}
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.clearButton}
                    onPress={clearRecording}
                >
                    <Text style={styles.clearButtonText}>
                        Clear
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black",
        paddingHorizontal: 24,
    },

    header: {
        alignItems: "center",
        flexDirection: "row",
        height: 70,
        justifyContent: "space-between",
    },

    title: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "bold",
    },

    headerButton: {
        alignItems: "center",
        backgroundColor: "#202020",
        borderRadius: 22,
        height: 44,
        justifyContent: "center",
        width: 44,
    },

    headerButtonPressed: {
        opacity: 0.65,
    },

    headerButtonDisabled: {
        opacity: 0.4,
    },

    backIcon: {
        color: "#FFFFFF",
        fontSize: 36,
        lineHeight: 39,
    },

    recorderContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    recordingIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
    },

    redDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#FF3B30",
    },

    recordingText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FF3B30",
    },

    timer: {
        fontSize: 64,
        fontWeight: "300",
        color: "#FFFFFF",
    },

    buttonContainer: {
        alignItems: "center",
        marginBottom: 30,
    },

    recordButtonOuter: {
        width: 108,
        height: 108,
        borderRadius: 54,
        backgroundColor: "#151515",
        borderWidth: 2,
        borderColor: "#303030",
        alignItems: "center",
        justifyContent: "center",
    },

    recordButtonInner: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#FF4248",
    },

    recordingButtonInner: {
        width: 42,
        height: 42,
        borderRadius: 8,
    },

    recordButtonPressed: {
        opacity: 0.7,
    },

    buttonText: {
        marginTop: 12,
        color: "#777777",
        fontSize: 14,
    },

    recordingCard: {
        backgroundColor: "#181818",
        padding: 18,
        borderRadius: 16,
        marginBottom: 25,
        gap: 16,
    },

    recordingTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    recordingInfo: {
        marginTop: 4,
        color: "#888888",
    },

    recordingActions: {
        flexDirection: "row",
        gap: 10,
    },

    playButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
    },

    playButtonText: {
        color: "#000000",
        fontWeight: "600",
    },

    clearButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#303030",
        alignItems: "center",
    },

    clearButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },

});
