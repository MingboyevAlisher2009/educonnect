import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

export default function GroupLayout() {
  const router = useRouter();
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Group",
          headerLeft: () => (
            <Pressable onPress={handleBack} className="pl-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
