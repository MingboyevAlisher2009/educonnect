"use client";

import ProfileEditModal from "@/components/profile-update-modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as FileSystem from "expo-file-system";

type ProfileData = {
  id: string;
  email: string;
  username: string;
  imageurl?: string;
  condidate_role: string;
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, username, imageurl, condidate_role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfileData(data);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = () => {
    fetchProfileData();
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleUpdateProfile = async ({
    email,
    name,
    imageurl,
  }: {
    email: string;
    name: string;
    imageurl?: string;
  }) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) {
          Alert.alert("Error", authError.message);
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: name,
          imageurl: imageurl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      Alert.alert("Success", "Profile updated successfully");
      setModalVisible(false);
      fetchProfileData();
      refreshUser && refreshUser();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadProfilePicture = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library"
        );
        return;
      }

      // Launch image picker with improved options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // We'll use blob approach instead
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // Log image details for debugging
        console.log("Selected image:", {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize,
          type: selectedImage.type,
        });

        await uploadImage(selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Copy the file to app's document directory first
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const localFileName = `${Date.now()}.${fileExt}`;
      const localFilePath = `${FileSystem.documentDirectory}${localFileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: localFilePath,
      });

      const fileInfo = await FileSystem.getInfoAsync(localFilePath);
      console.log("Local file info:", fileInfo);

      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error("Failed to copy file or file is empty");
      }

      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const fileContent = await FileSystem.readAsStringAsync(localFilePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!fileContent || fileContent.length === 0) {
        throw new Error("Failed to read file content");
      }

      console.log("File content length:", fileContent.length);

      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(filePath, decode(fileContent), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }

      console.log("Upload successful:", data);

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      console.log("Public URL:", urlData.publicUrl);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          imageurl: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }

      // Clean up the local file
      await FileSystem.deleteAsync(localFilePath);

      Alert.alert("Success", "Profile picture updated successfully");
      fetchProfileData();
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Error",
        "Failed to upload profile picture: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const decode = (base64String: string): Uint8Array => {
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const atob = (input: string) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let str = input.replace(/=+$/, "");
    let output = "";

    if (str.length % 4 === 1) {
      throw new Error(
        "'atob' failed: The string to be decoded is not correctly encoded."
      );
    }

    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const displayName =
    profileData?.username || user?.email?.split("@")[0] || "User";
  const displayEmail = profileData?.email || user?.email || "";
  const displayRole =
    profileData?.condidate_role || user?.condidate_role || "user";
  const displayImage = profileData?.imageurl;

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
      }
      className="flex-1 bg-gray-100"
    >
      <View className="bg-blue-500 p-4 pb-16 rounded-b-3xl mb-4">
        <Text className="text-white text-xl font-bold">Profile</Text>
      </View>

      <View className="px-6">
        <View className="bg-white rounded-xl shadow-md p-8 items-center -mt-10 mb-6">
          <TouchableOpacity
            className="relative"
            onPress={handleUploadProfilePicture}
            disabled={isSubmitting}
          >
            {displayImage ? (
              <Image
                source={{ uri: displayImage }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="bg-blue-200 rounded-full w-24 h-24 items-center justify-center">
                <Text className="text-blue-500 text-4xl font-bold">
                  {displayEmail.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-white rounded-full p-2 border border-gray-300">
              <Ionicons name="camera-outline" size={16} color="blue" />
            </View>
          </TouchableOpacity>
          {isSubmitting && <ActivityIndicator className="mt-2" />}
          <Text className="text-2xl font-bold mt-4 text-gray-800 capitalize">
            {displayName}
          </Text>
          <Text className="text-gray-500 mt-1 capitalize">{displayRole}</Text>
        </View>

        <View className="bg-white rounded-xl shadow p-6 mb-4">
          <Text className="text-xl font-semibold text-gray-700 mb-3">
            Shaxsiy ma'lumotlar
          </Text>
          <View className="flex-row items-center mb-2 border-b gap-3 py-4 border-gray-500">
            <Ionicons name="person-outline" size={20} color="gray" />
            <View className="ml-3">
              <Text className="text-gray-500 text-lg">Ism va familiya</Text>
              <Text className="text-gray-800 font-semibold capitalize mt-2">
                {displayName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mb-2 border-b gap-3 py-4 border-gray-500">
            <Ionicons name="mail-outline" size={20} color="gray" />
            <View className="ml-3">
              <Text className="text-gray-500 text-lg">Email</Text>
              <Text className="text-gray-800 font-semibold mt-2">
                {displayEmail}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mb-2 border-b gap-3 py-4 border-gray-500">
            <Ionicons name="book-outline" size={20} color="gray" />
            <View className="ml-3">
              <Text className="text-gray-500 text-lg">Holati</Text>
              <Text className="text-gray-800 font-semibold capitalize mt-2">
                {displayRole}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-xl shadow p-8">
          <Text className="text-xl font-semibold text-gray-700 mb-3">
            Ilova sozlamalari
          </Text>
          <View className="flex-row items-center mb-2 border-b gap-3 py-4 border-gray-500">
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="ml-3"
              disabled={isSubmitting}
            >
              <Text className="text-gray-800 font-semibold capitalize mt-2">
                Profilni tahrirlash
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          className="w-full my-20 border rounded-md border-red-500 flex-row items-center justify-center gap-2 p-5"
          disabled={isSubmitting}
        >
          <Ionicons name="log-out-outline" color={"#ef4444"} size={20} />
          <Text className="text-xl text-red-500">Chiqish</Text>
        </TouchableOpacity>
      </View>

      <ProfileEditModal
        visible={modalVisible}
        uploadImage={uploadImage}
        onClose={() => setModalVisible(false)}
        isSubmitting={isSubmitting}
        onUpdate={handleUpdateProfile}
        currentData={{
          email: displayEmail,
          name: displayName,
          imageUrl: displayImage,
        }}
      />
    </ScrollView>
  );
}
