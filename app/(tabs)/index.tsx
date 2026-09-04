import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Alert,
    Animated,
    AppState,
    type AppStateStatus,
} from "react-native";

import {
    CameraView,
    useCameraPermissions,
} from "expo-camera";

import type {
    CameraType,
} from "expo-camera";

import * as MediaLibrary from "expo-media-library";

import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import {
    Accelerometer,
} from "expo-sensors";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { SettingsButton } from "@/components/settings-button";
import {
    type PhotoResolution,
    useSettings,
} from "@/contexts/settings-context";

type NumericPictureSize = {
    pixels: number;
    ratio: number;
    value: string;
};

const SHAKE_FORCE_MIN = 1.05;
const SHAKE_FORCE_MID = 2.2;
const SHAKE_FORCE_MAX = 5.0;

function getShakeForceThreshold(percent: number) {
    const clampedPercent =
        Math.max(0, Math.min(100, percent));

    if (clampedPercent <= 50) {
        return (
            SHAKE_FORCE_MIN +
            (clampedPercent / 50) *
                (SHAKE_FORCE_MID - SHAKE_FORCE_MIN)
        );
    }

    return (
        SHAKE_FORCE_MID +
        ((clampedPercent - 50) / 50) *
            (SHAKE_FORCE_MAX - SHAKE_FORCE_MID)
    );
}

function selectPictureSize(
    availableSizes: string[],
    resolution: PhotoResolution
) {
    const symbolicSizes: Record<PhotoResolution, string[]> = {
        low: ["Low"],
        medium: ["Medium"],
        high: ["Photo", "High"],
    };

    const symbolicMatch =
        symbolicSizes[resolution].find(size =>
            availableSizes.includes(size)
        );

    if (symbolicMatch) {
        return symbolicMatch;
    }

    const numericSizes =
        availableSizes
            .map((value): NumericPictureSize | null => {
                const match = /^(\d+)x(\d+)$/.exec(value);

                if (!match) {
                    return null;
                }

                const width = Number(match[1]);
                const height = Number(match[2]);

                return {
                    pixels: width * height,
                    ratio: Math.max(width, height) /
                        Math.min(width, height),
                    value,
                };
            })
            .filter(
                (size): size is NumericPictureSize =>
                    size !== null
            );

    const fourByThreeSizes =
        numericSizes.filter(size =>
            Math.abs(size.ratio - 4 / 3) < 0.03
        );
    const candidates =
        fourByThreeSizes.length >= 3
            ? fourByThreeSizes
            : numericSizes;

    candidates.sort((first, second) =>
        first.pixels - second.pixels
    );

    if (candidates.length === 0) {
        return undefined;
    }

    const index =
        resolution === "low"
            ? 0
            : resolution === "medium"
              ? Math.floor((candidates.length - 1) / 2)
              : candidates.length - 1;

    return candidates[index]?.value;
}

export default function CameraPage() {
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { isHydrated, settings } = useSettings();

    const cameraRef =
        useRef<CameraView>(null);

    const cameraReadyRef =
        useRef(false);

    const isFocusedRef =
        useRef(isFocused);

    const appIsActiveRef =
        useRef(AppState.currentState === "active");

    const takingPhotoRef =
        useRef(false);

    const countdownActiveRef =
        useRef(false);

    const countdownTimerRef =
        useRef<ReturnType<typeof setInterval> | null>(null);

    const pendingCaptureRef =
        useRef(false);

    const flashOpacity =
        useRef(new Animated.Value(0)).current;

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [isTakingPhoto, setIsTakingPhoto] =
        useState(false);

    const [isCameraReady, setIsCameraReady] =
        useState(false);

    const [availablePictureSizes, setAvailablePictureSizes] =
        useState<string[]>([]);

    const [appState, setAppState] =
        useState<AppStateStatus>(AppState.currentState);

    const [countdown, setCountdown] =
        useState<number | null>(null);

    const [
        cameraPermission,
        requestCameraPermission,
    ] = useCameraPermissions();

    const [
        mediaPermission,
        requestMediaPermission,
    ] = MediaLibrary.usePermissions({
        writeOnly: true,
        granularPermissions: ["photo"],
    });

    const selectedPictureSize =
        selectPictureSize(
            availablePictureSizes,
            settings.photoResolution
        );

    const setCameraInstance =
        useCallback((camera: CameraView | null) => {
            cameraRef.current = camera;
            cameraReadyRef.current = false;
            setIsCameraReady(false);
        }, []);

    const showCaptureAnimation =
        useCallback(() => {
            flashOpacity.stopAnimation();

            flashOpacity.setValue(0.7);

            Animated.timing(
                flashOpacity,
                {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }
            ).start();
        }, [flashOpacity]);

    const cancelCountdown =
        useCallback(() => {
            if (countdownTimerRef.current) {
                clearInterval(
                    countdownTimerRef.current
                );

                countdownTimerRef.current = null;
            }

            countdownActiveRef.current = false;
            setCountdown(null);
        }, []);

    const handleCameraReady =
        useCallback(async () => {
            const camera = cameraRef.current;

            if (
                !camera ||
                !isFocusedRef.current ||
                !appIsActiveRef.current
            ) {
                return;
            }

            if (selectedPictureSize) {
                cameraReadyRef.current = true;
                setIsCameraReady(true);

                return;
            }

            try {
                const sizes =
                    await camera.getAvailablePictureSizesAsync();

                if (
                    !isFocusedRef.current ||
                    !appIsActiveRef.current ||
                    cameraRef.current !== camera
                ) {
                    return;
                }

                const resolvedSize =
                    selectPictureSize(
                        sizes,
                        settings.photoResolution
                    );

                if (resolvedSize) {
                    setAvailablePictureSizes(sizes);

                    return;
                }

                cameraReadyRef.current = true;
                setIsCameraReady(true);
            } catch (error) {
                console.warn(
                    "Unable to get picture sizes:",
                    error
                );

                if (
                    isFocusedRef.current &&
                    appIsActiveRef.current &&
                    cameraRef.current === camera
                ) {
                    cameraReadyRef.current = true;
                    setIsCameraReady(true);
                }
            }
        }, [selectedPictureSize, settings.photoResolution]);

    const takePhoto =
        useCallback(async () => {
            const camera = cameraRef.current;

            if (
                takingPhotoRef.current ||
                !camera ||
                !cameraReadyRef.current ||
                !isFocusedRef.current ||
                !appIsActiveRef.current
            ) {
                return;
            }

            takingPhotoRef.current = true;
            setIsTakingPhoto(true);

            try {
                if (!mediaPermission?.granted) {
                    pendingCaptureRef.current = true;

                    const result =
                        await requestMediaPermission();

                    if (!result.granted) {
                        pendingCaptureRef.current = false;

                        return;
                    }

                    return;
                }

                if (
                    !cameraReadyRef.current ||
                    !isFocusedRef.current ||
                    !appIsActiveRef.current ||
                    cameraRef.current !== camera
                ) {
                    return;
                }

                showCaptureAnimation();

                const photo =
                    await camera.takePictureAsync();

                if (!photo) {
                    return;
                }

                await MediaLibrary.saveToLibraryAsync(
                    photo.uri
                );

                console.log(
                    "Saved to Photos:",
                    photo.uri
                );

            } catch (error) {
                pendingCaptureRef.current = false;

                console.log(
                    "Take photo error:",
                    error
                );

                Alert.alert(
                    "Error",
                    "Cannot save photo"
                );

            } finally {
                takingPhotoRef.current = false;
                setIsTakingPhoto(false);
            }
        }, [
            mediaPermission?.granted,
            requestMediaPermission,
            showCaptureAnimation,
        ]);

    useEffect(() => {
        if (
            !pendingCaptureRef.current ||
            !mediaPermission?.granted ||
            !isCameraReady ||
            !isFocused ||
            appState !== "active"
        ) {
            return;
        }

        pendingCaptureRef.current = false;
        void takePhoto();
    }, [
        appState,
        isCameraReady,
        isFocused,
        mediaPermission?.granted,
        takePhoto,
    ]);

    const startShakeCountdown =
        useCallback(() => {
            if (
                countdownActiveRef.current ||
                takingPhotoRef.current ||
                !cameraReadyRef.current ||
                !isFocusedRef.current ||
                !appIsActiveRef.current
            ) {
                return;
            }

            countdownActiveRef.current = true;

            let current = settings.countdownSeconds;

            setCountdown(current);

            countdownTimerRef.current =
                setInterval(() => {
                    current -= 1;

                    if (current > 0) {
                        setCountdown(current);

                        return;
                    }

                    if (countdownTimerRef.current) {
                        clearInterval(
                            countdownTimerRef.current
                        );

                        countdownTimerRef.current = null;
                    }

                    setCountdown(null);

                    void (async () => {
                        try {
                            await takePhoto();
                        } finally {
                            countdownActiveRef.current =
                                false;
                        }
                    })();
                }, 1000);
        }, [settings.countdownSeconds, takePhoto]);

    useEffect(() => {
        isFocusedRef.current = isFocused;

        if (!isFocused) {
            cameraReadyRef.current = false;
            pendingCaptureRef.current = false;
            cancelCountdown();
        }
    }, [cancelCountdown, isFocused]);

    useEffect(() => {
        const subscription =
            AppState.addEventListener(
                "change",
                nextAppState => {
                    const isActive =
                        nextAppState === "active";

                    appIsActiveRef.current = isActive;
                    setAppState(nextAppState);

                    if (!isActive) {
                        cameraReadyRef.current = false;
                        setIsCameraReady(false);
                        cancelCountdown();
                    }
                }
            );

        return () => {
            subscription.remove();
        };
    }, [cancelCountdown]);

    useEffect(() => {
        if (
            !cameraPermission?.granted ||
            !isCameraReady ||
            !isFocused ||
            !isHydrated ||
            appState !== "active"
        ) {
            return;
        }

        Accelerometer.setUpdateInterval(100);

        let lastShakeTime = 0;

        const subscription =
            Accelerometer.addListener(
                ({ x, y, z }) => {
                    const force =
                        Math.sqrt(
                            x * x +
                            y * y +
                            z * z
                        );

                    const now =
                        Date.now();

                    const shakeThreshold =
                        getShakeForceThreshold(
                            settings.shakeThresholdPercent
                        );

                    if (
                        force > shakeThreshold &&
                        now - lastShakeTime > 1000
                    ) {
                        lastShakeTime = now;

                        startShakeCountdown();
                    }
                }
            );

        return () => {
            subscription.remove();
        };
    }, [
        cameraPermission?.granted,
        appState,
        isCameraReady,
        isFocused,
        isHydrated,
        settings.shakeThresholdPercent,
        startShakeCountdown,
    ]);

    useEffect(() => {
        return () => {
            cancelCountdown();
        };
    }, [cancelCountdown]);

    const flipCamera = () => {
        if (
            isTakingPhoto ||
            countdownActiveRef.current
        ) {
            return;
        }

        cameraReadyRef.current = false;
        setIsCameraReady(false);
        setAvailablePictureSizes([]);

        setFacing(
            current =>
                current === "back"
                    ? "front"
                    : "back"
        );
    };

    if (!cameraPermission) {
        return <View />;
    }

    if (!cameraPermission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <SettingsButton
                    disabled={!isHydrated}
                    style={[
                        styles.settingsButton,
                        { top: insets.top + 10 },
                    ]}
                />

                <Text style={styles.permissionText}>
                    Camera permission is required
                </Text>

                <Pressable
                    accessibilityLabel="Allow camera access"
                    accessibilityRole="button"
                    onPress={requestCameraPermission}
                    style={styles.permissionButton}
                >
                    <Text style={styles.permissionButtonText}>
                        Allow Camera
                    </Text>
                </Pressable>
            </View>
        );
    }

    const controlsDisabled =
        isTakingPhoto ||
        countdown !== null ||
        !isCameraReady ||
        !isHydrated;

    const cameraKey =
        `${facing}:${selectedPictureSize ?? "detect"}`;

    return (
        <View style={styles.container}>
            <View style={styles.topBlackBar} />

            {isFocused && appState === "active" && (
                <CameraView
                    facing={facing}
                    key={cameraKey}
                    onCameraReady={handleCameraReady}
                    pictureSize={selectedPictureSize}
                    ratio={
                        selectedPictureSize
                            ? undefined
                            : "4:3"
                    }
                    ref={setCameraInstance}
                    style={styles.camera}
                />
            )}

            <Animated.View
                pointerEvents="none"
                style={[
                    styles.captureFlash,
                    {
                        opacity: flashOpacity,
                    },
                ]}
            />

            <SettingsButton
                disabled={
                    !isHydrated ||
                    isTakingPhoto ||
                    countdown !== null
                }
                style={[
                    styles.settingsButton,
                    { top: insets.top + 10 },
                ]}
            />

            <Pressable
                accessibilityLabel="Open voice recorder"
                accessibilityRole="button"
                disabled={controlsDisabled}
                onPress={() => {
                    cancelCountdown();
                    router.push("/(tabs)/voice_record");
                }}
                style={[
                    styles.voiceButton,
                    controlsDisabled &&
                        styles.sideControlDisabled,
                ]}
            >
                <Text style={styles.voiceButtonText}>
                    Voice Recorder
                </Text>
            </Pressable>

            {countdown !== null && (
                <View
                    pointerEvents="none"
                    style={styles.countdownContainer}
                >
                    <Text style={styles.countdownText}>
                        {countdown}
                    </Text>
                </View>
            )}

            <View style={styles.bottomBlackBar} />

            <View style={styles.controls}>
                <View style={styles.sideButton} />

                <Pressable
                    accessibilityLabel="Take photo"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: controlsDisabled }}
                    disabled={controlsDisabled}
                    onPress={takePhoto}
                    style={[
                        styles.shutterOuter,
                        controlsDisabled &&
                            styles.shutterDisabled,
                    ]}
                >
                    <View
                        style={styles.shutterInner}
                    />
                </Pressable>

                <Pressable
                    accessibilityLabel={
                        facing === "back"
                            ? "Switch to front camera"
                            : "Switch to back camera"
                    }
                    accessibilityRole="button"
                    accessibilityState={{ disabled: controlsDisabled }}
                    disabled={controlsDisabled}
                    onPress={flipCamera}
                    style={styles.sideButton}
                >
                    <Text style={styles.flipText}>
                        ↻
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
    },

    camera: {
        flex: 1,
    },

    captureFlash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "white",
    },

    countdownContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },

    countdownText: {
        color: "white",
        fontSize: 100,
        fontWeight: "bold",
    },

    controls: {
        position: "absolute",
        bottom: 40,
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 3,
    },

    shutterOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 5,
        borderColor: "white",
        justifyContent: "center",
        alignItems: "center",
    },

    shutterInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "white",
    },

    shutterDisabled: {
        opacity: 0.5,
    },

    sideControlDisabled: {
        opacity: 0.4,
    },

    sideButton: {
        width: 55,
        height: 55,
        justifyContent: "center",
        alignItems: "center",
    },

    flipText: {
        color: "white",
        fontSize: 40,
    },

    permissionContainer: {
        backgroundColor: "black",
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    permissionText: {
        color: "white",
        fontSize: 16,
        marginBottom: 20,
    },

    permissionButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "black",
    },

    permissionButtonText: {
        color: "white",
        fontSize: 16,
    },

    voiceButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        bottom: 52,
        left: 35,
        zIndex: 4,
    },

    voiceButtonText: {
        color: "#FF4248",
        fontSize: 12,
        fontWeight: "bold",
    },

    topBlackBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: "black",
        zIndex: 2,
    },

    settingsButton: {
        position: "absolute",
        right: 18,
        zIndex: 6,
    },

    bottomBlackBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 190,
        backgroundColor: "black",
        zIndex: 2,
    },
});
