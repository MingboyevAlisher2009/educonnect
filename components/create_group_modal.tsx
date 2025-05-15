import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (group: { name: string; description: string }) => void;
};

type Student = {
  id: string;
  email: string;
};

export default function CreateGroupModal({
  visible,
  isSubmitting,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Group name is required.");
      return;
    }

    onCreate({ name, description });
    setName("");
    setDescription("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-2xl font-bold text-center mb-6">
            Create New Group
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Task Title</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter task title"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Description</Text>
            <TextInput
              className="border border-gray-300 h-24 rounded-lg p-3 bg-white"
              placeholder="Enter task description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="flex-1 mr-2 py-3 border border-gray-300 rounded-lg items-center"
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 ml-2 py-3 bg-blue-500 rounded-lg items-center"
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">Create Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
