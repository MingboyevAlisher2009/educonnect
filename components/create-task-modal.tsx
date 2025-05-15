import { supabase } from "@/lib/supabase";
import type { SubmissionType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const atob = (input: string) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const str = input.replace(/=+$/, "");
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

const decode = (base64String: string): Uint8Array => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

type CreateTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupInfo?: SubmissionType | null;
  onTaskCreated: () => void;
};

export default function CreateTaskModal({
  visible,
  onClose,
  groupId,
  groupInfo,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    type: string;
    size?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupInfo) {
      setTitle(groupInfo?.title || "");
      setDescription(groupInfo?.description || "");

      try {
        if (groupInfo.due_date && typeof groupInfo.due_date === "string") {
          const parsedDate = new Date(groupInfo.due_date);

          if (!isNaN(parsedDate.getTime())) {
            setDueDate(parsedDate);
          } else {
            console.error("Invalid date format:", groupInfo.due_date);
            setDueDate(new Date());
          }
        } else {
          console.error("Missing or invalid due_date:", groupInfo.due_date);
          setDueDate(new Date());
        }
      } catch (error) {
        console.error("Error parsing date:", error);
        setDueDate(new Date());
      }
    }
  }, [groupInfo]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(new Date());
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("Document picking canceled");
        return;
      }

      const file = result.assets[0];
      console.log("Selected file:", file);

      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      console.log("File info:", fileInfo);

      if (!fileInfo.exists) {
        Alert.alert("Error", "File does not exist or is not accessible");
        return;
      }

      if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert("File too large", "Please select a file smaller than 10MB");
        return;
      }

      if (fileInfo.size === 0) {
        Alert.alert("Invalid file", "The selected file is empty");
        return;
      }

      setSelectedFile({
        name: file.name,
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        size: fileInfo.size,
      });
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to select document");
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `tasks/${fileName}`;

      const fileUri = selectedFile.uri;

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!fileContent) {
        throw new Error("Could not read file content");
      }

      const { data, error } = await supabase.storage
        .from("task-files")
        .upload(filePath, decode(fileContent), {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("task-files")
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: urlData.publicUrl,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const createTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }

    if (!dueDate || !(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
      Alert.alert("Error", "Please select a valid due date");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileData = null;

      if (selectedFile) {
        try {
          fileData = await uploadFile();
          console.log("File uploaded successfully:", fileData);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          Alert.alert(
            "File Upload Failed",
            "The task will be created without the file attachment. You can try adding the file later."
          );
        }
      }

      if (groupInfo) {
        const { error } = await supabase.from("tasks").upsert({
          id: groupInfo.id,
          title,
          description,
          due_date: dueDate.toISOString(),
          group_id: groupId,
          file_path: fileData?.path || groupInfo.file_path || null,
        });

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("tasks").insert({
          title,
          description,
          due_date: dueDate.toISOString(),
          group_id: groupId,
          file_path: fileData?.path || null,
        });

        if (error) {
          throw error;
        }
      }

      Alert.alert(
        "Success",
        groupInfo ? "Task updated successfully" : "Task created successfully"
      );
      onTaskCreated();
      handleClose();
    } catch (error) {
      console.error("Error creating/updating task:", error);
      Alert.alert("Error", `Failed to ${groupInfo ? "update" : "create"} task`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = () => {
    try {
      if (dueDate && dueDate instanceof Date && !isNaN(dueDate.getTime())) {
        return dueDate.toISOString().split("T")[0];
      }
      return "Select a date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Select a date";
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
            {groupInfo ? "Update Task" : "Create New Task"}
          </Text>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Task Title</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Description</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter task description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1">Due Date</Text>
            <Pressable
              className="border border-gray-300 rounded-lg p-3 bg-white"
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{formatDateForDisplay()}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={
                  dueDate instanceof Date && !isNaN(dueDate.getTime())
                    ? dueDate
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center border border-gray-300 rounded-lg p-3 bg-white mb-6"
            onPress={pickDocument}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#4285F4" />
            <Text className="text-blue-500 ml-2">
              {selectedFile
                ? selectedFile.name
                : "Fayl qo'shish (PDF yoki DOCX)"}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="flex-1 mr-2 py-3 border border-gray-300 rounded-lg items-center"
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 ml-2 py-3 bg-blue-500 rounded-lg items-center"
              onPress={createTask}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium">
                  {groupInfo ? "Update Task" : "Create Task"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
