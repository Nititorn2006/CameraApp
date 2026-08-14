import { requireNativeViewManager } from "expo-modules-core";
import { ViewProps } from "react-native";
import * as React from "react";

export type MyModuleViewProps = ViewProps;

const NativeView: React.ComponentType<MyModuleViewProps> =
    requireNativeViewManager("MyModule");

export default function MyModuleView(
    props: MyModuleViewProps
) {
    return <NativeView {...props} />;
}