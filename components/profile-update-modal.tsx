"use client";

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ProfileEditModalProps = {
  visible: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  uploadImage: (url: string) => void;
  onUpdate: (data: { email: string; name: string; imageUrl?: string }) => void;
  currentData?: {
    email: string;
    name: string;
    imageUrl?: string;
  };
};

export default function ProfileEditModal({
  visible,
  onClose,
  uploadImage,
  isSubmitting,
  onUpdate,
  currentData,
}: ProfileEditModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentData) {
      setEmail(currentData.email || "");
      setName(currentData.name || "");
      setImageUrl(currentData.imageUrl);
    }
  }, [currentData, visible]);

  const handleSubmit = () => {
    if (!email.trim()) {
      return Alert.alert("Error", "Email is required");
    }

    onUpdate({ email, name, imageUrl });
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-2xl font-bold text-center mb-6">
            Edit Profile
          </Text>

          <View className="items-center mb-6">
            <TouchableOpacity onPress={pickImage} className="relative">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="bg-blue-200 rounded-full w-24 h-24 items-center justify-center">
                  <Text className="text-blue-500 text-4xl font-bold">
                    {email ? email.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-white rounded-full p-2 border border-gray-300">
                <Ionicons name="camera-outline" size={16} color="blue" />
              </View>
            </TouchableOpacity>
            {uploading && <ActivityIndicator className="mt-2" />}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Full Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 mb-1">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="flex-1 mr-2 py-3 border border-gray-300 rounded-lg items-center"
              onPress={onClose}
              disabled={isSubmitting || uploading}
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 ml-2 py-3 bg-blue-500 rounded-lg items-center"
              onPress={handleSubmit}
              disabled={isSubmitting || uploading}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
