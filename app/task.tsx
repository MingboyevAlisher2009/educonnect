import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { format } from "date-fns";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

type Task = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  group_id: string;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  group?: {
    id: string;
    name: string;
  };
};

type Submission = {
  id: string;
  task_id: string;
  student_id: string;
  content: string;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  status: string;
  rating: number | null;
  feedback: string | null;
  submitted_at: string;
};

const decode = (base64String: string): Uint8Array => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const str = base64String.replace(/=+$/, "");
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

  const binaryString = output;
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export default function TaskDetailsScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    type: string;
    size?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchTaskAndSubmission = useCallback(async () => {
    if (!taskId || !user) return;

    setLoading(true);
    try {
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*, group:groups(id, name)")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Error fetching task:", taskError);
        Alert.alert("Error", "Failed to load task details");
        return;
      }

      setTask(taskData);

      const { data: submissionData, error: submissionError } = await supabase
        .from("submissions")
        .select("*")
        .eq("task_id", taskId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (submissionError) {
        console.error("Error fetching submission:", submissionError);
      } else if (submissionData) {
        setSubmission(submissionData);
        setContent(submissionData.content || "");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useFocusEffect(
    useCallback(() => {
      fetchTaskAndSubmission();
      return () => {};
    }, [fetchTaskAndSubmission])
  );

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
        return;
      }

      const file = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(file.uri);

      if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert("File too large", "Please select a file smaller than 10MB");
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
      const filePath = `submissions/${fileName}`;

      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await supabase.storage
        .from("submission-files")
        .upload(filePath, decode(fileContent), {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("submission-files")
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

  const submitAnswer = async () => {
    if (!user || !taskId) return;

    if (!content.trim() && !selectedFile) {
      Alert.alert("Error", "Please enter a response or upload a file");
      return;
    }

    setSubmitting(true);
    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile();
      }

      if (submission) {
        const { error } = await supabase
          .from("submissions")
          .update({
            content,
            file_path: fileData?.path || submission.file_path,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("submissions").insert({
          task_id: taskId,
          student_id: user.id,
          content,
          file_path: fileData?.path || null,
          status: "pending",
        });

        if (error) throw error;
      }

      Alert.alert("Success", "Your answer has been submitted");
      fetchTaskAndSubmission();
      setSelectedFile(null);
    } catch (error) {
      console.error("Error submitting answer:", error);
      Alert.alert("Error", "Failed to submit your answer");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    if (!url || !filename) {
      Alert.alert("Error", "File not available");
      return;
    }

    setDownloading(true);
    try {
      const dir = FileSystem.documentDirectory + "downloads/";

      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      const cleanFilename = filename.split("/").pop() || "downloaded-file";
      const fileUri = dir + cleanFilename;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri
      );
      const { uri } = await downloadResumable.downloadAsync();

      if (!uri) {
        throw new Error("Download failed");
      }

      console.log("Downloaded to:", uri);
      Alert.alert("Success", "File downloaded successfully");

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const getTaskFileUrl = () => {
    if (!task?.file_path) return null;

    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-files/${task.file_path}`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View className="p-4 py-5 bg-blue-500">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text className="text-white ml-2 text-2xl">Vazifa</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-white">
        <View className="rounded-t-3xl p-6 pt-8 mt-5 shadow-lg">
          <Text className="text-2xl font-bold text-gray-800 mb-2 capitalize">
            {task?.title}
          </Text>
          <View className="flex-row items-center mb-4">
            <Ionicons name="calendar-outline" size={16} color="gray" />
            <Text className="text-gray-500 ml-1 text-sm">
              Muddati:{" "}
              {task?.due_date &&
                format(new Date(task?.due_date), "MMM dd, yyyy")}
            </Text>
          </View>
          <Text className="text-gray-700 mb-4">{task?.description}</Text>

          {task?.file_path && (
            <>
              <TouchableOpacity
                onPress={() => {
                  const url = getTaskFileUrl();
                  if (url) {
                    router.push(url);
                  }
                }}
                className="bg-blue-500 rounded-lg py-3 items-center mb-2"
              >
                <Text className="text-white font-semibold">
                  Vazifa faylini ko'rish
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const url = getTaskFileUrl();
                  if (url) {
                    downloadFile(url, task.file_name || task.file_path);
                  }
                }}
                disabled={downloading}
                className="bg-blue-100 rounded-lg py-3 items-center mb-6"
              >
                {downloading ? (
                  <ActivityIndicator color="#3b82f6" size="small" />
                ) : (
                  <Text className="text-blue-500 font-semibold">
                    Vazifa faylini yuklab olish
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {submission?.rating && (
            <View className="bg-gray-100 rounded-lg p-4 mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  Baholash
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text className="ml-1 font-bold">{submission.rating}/5</Text>
                </View>
              </View>
              {submission.feedback && (
                <>
                  <Text className="text-gray-600 mb-1">O'qituvchi izohi:</Text>
                  <Text className="text-gray-800">{submission.feedback}</Text>
                </>
              )}
            </View>
          )}

          <Text className="text-lg font-semibold text-gray-800 mb-3">
            {submission ? "Javobingizni tahrirlash" : "Javob yuborish"}
          </Text>
          <Text className="text-gray-600 mb-2 text-sm">
            Javob tavsifingiz haqida qisqacha ma'lumot bering
          </Text>
          <TextInput
            className="bg-gray-100 rounded-lg p-3 mb-4 h-24 text-gray-700"
            multiline
            numberOfLines={4}
            placeholder="Javobingizni kiriting..."
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={pickDocument}
            className="bg-gray-100 rounded-lg p-4 flex-row items-center justify-center mb-6 border border-dashed border-gray-400"
          >
            <Ionicons name="cloud-upload-outline" size={24} color="gray" />
            <Text className="text-gray-600 ml-2 text-sm">
              {selectedFile
                ? selectedFile.name
                : submission?.file_name ||
                  "Javob faylini tanlang (PDF yoki DOCX)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitAnswer}
            disabled={submitting}
            className={`rounded-lg py-3 items-center ${
              submitting ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold">
                {submission ? "Javobni yangilash" : "Javob yuborish"}
              </Text>
            )}
          </TouchableOpacity>

          {submission && (
            <View className="mt-6 pt-6 border-t border-gray-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-500 text-sm">Yuborilgan vaqt:</Text>
                <Text className="text-gray-700 text-sm">
                  {format(
                    new Date(submission.submitted_at),
                    "MMM dd, yyyy HH:mm"
                  )}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500 text-sm">Holati:</Text>
                <View
                  className={`px-2 py-1 rounded-full ${
                    submission.status === "completed"
                      ? "bg-green-100"
                      : submission.status === "locked"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      submission.status === "completed"
                        ? "text-green-700"
                        : submission.status === "locked"
                        ? "text-red-700"
                        : "text-yellow-700"
                    }`}
                  >
                    {submission.status === "completed"
                      ? "Tekshirilgan"
                      : submission.status === "locked"
                      ? "Bloklangan"
                      : "Kutilmoqda"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
