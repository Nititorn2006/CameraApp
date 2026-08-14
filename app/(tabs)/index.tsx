import {
    View,
    Text,
    Button,
    StyleSheet,
} from "react-native";

import {
    CameraView,
    useCameraPermissions,
} from "expo-camera";

export default function CameraPage() {
    const [permission, requestPermission] =
        useCameraPermissions();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text>
                    Camera permission is required
                </Text>

                <Button
                    title="Allow Camera"
                    onPress={requestPermission}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
            />
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

    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});