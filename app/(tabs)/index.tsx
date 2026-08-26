import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Alert,
    Animated,
} from "react-native";

import {
    CameraView,
    useCameraPermissions,
} from "expo-camera";

import type {
    CameraType,
} from "expo-camera";

import * as MediaLibrary from "expo-media-library";

import {
    Accelerometer,
} from "expo-sensors";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

export default function CameraPage() {
    const cameraRef =
        useRef<CameraView>(null);

    const takingPhotoRef =
        useRef(false);

    const countdownActiveRef =
        useRef(false);

    const countdownTimerRef =
        useRef<ReturnType<typeof setInterval> | null>(null);

    const flashOpacity =
        useRef(new Animated.Value(0)).current;

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [isTakingPhoto, setIsTakingPhoto] =
        useState(false);

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

    const takePhoto =
        useCallback(async () => {
            if (
                takingPhotoRef.current ||
                !cameraRef.current
            ) {
                return;
            }

            takingPhotoRef.current = true;
            setIsTakingPhoto(true);

            try {
                if (!mediaPermission?.granted) {
                    const result =
                        await requestMediaPermission();

                    if (!result.granted) {
                        return;
                    }
                }

                showCaptureAnimation();

                const photo =
                    await cameraRef.current.takePictureAsync();

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

    const startShakeCountdown =
        useCallback(() => {
            if (
                countdownActiveRef.current ||
                takingPhotoRef.current
            ) {
                return;
            }

            countdownActiveRef.current = true;

            let current = 3;

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
        }, [takePhoto]);

    useEffect(() => {
        if (!cameraPermission?.granted) {
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

                    if (
                        force > 2.2 &&
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
        startShakeCountdown,
    ]);

    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) {
                clearInterval(
                    countdownTimerRef.current
                );
            }
        };
    }, []);

    const flipCamera = () => {
        if (
            isTakingPhoto ||
            countdownActiveRef.current
        ) {
            return;
        }

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
                <Text style={styles.permissionText}>
                    Camera permission is required
                </Text>

                <Pressable
                    style={styles.permissionButton}
                    onPress={requestCameraPermission}
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
        countdown !== null;

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
            />

            <Animated.View
                pointerEvents="none"
                style={[
                    styles.captureFlash,
                    {
                        opacity: flashOpacity,
                    },
                ]}
            />

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

            <View style={styles.controls}>
                <View style={styles.sideButton} />

                <Pressable
                    style={[
                        styles.shutterOuter,
                        controlsDisabled &&
                            styles.shutterDisabled,
                    ]}
                    onPress={takePhoto}
                    disabled={controlsDisabled}
                >
                    <View
                        style={styles.shutterInner}
                    />
                </Pressable>

                <Pressable
                    style={styles.sideButton}
                    onPress={flipCamera}
                    disabled={controlsDisabled}
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
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    permissionText: {
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
});