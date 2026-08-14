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
    useRef,
    useState,
} from "react";

export default function CameraPage() {
    const cameraRef =
        useRef<CameraView>(null);

    const takingPhotoRef =
        useRef(false);

    const flashOpacity =
        useRef(new Animated.Value(0)).current;

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [isTakingPhoto, setIsTakingPhoto] =
        useState(false);

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

    const showCaptureAnimation = () => {
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
    };

    const takePhoto = async () => {
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
    };

    const flipCamera = () => {
        if (isTakingPhoto) {
            return;
        }

        setFacing(
            current =>
                current === "back"
                    ? "front"
                    : "back"
        );
    };

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

            <View style={styles.controls}>
                <View style={styles.sideButton} />

                <Pressable
                    style={[
                        styles.shutterOuter,
                        isTakingPhoto &&
                            styles.shutterDisabled,
                    ]}
                    onPress={takePhoto}
                    disabled={isTakingPhoto}
                >
                    <View
                        style={styles.shutterInner}
                    />
                </Pressable>

                <Pressable
                    style={styles.sideButton}
                    onPress={flipCamera}
                    disabled={isTakingPhoto}
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