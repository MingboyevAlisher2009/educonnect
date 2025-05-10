"use client";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Task = {
  id: string;
  title: string;
  description: string;
  due_date: string;
};

export default function Group() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRoute();

  const groupId = router?.params?.id;

  useEffect(() => {
    fetchTasks();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("condidate_role")
      .eq("id", user.id)
      .single();

    if (data) {
      setUserRole(data.condidate_role);
    } else if (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("group_id", groupId);
    setTasks(data || []);
  };

  const handleCreateTask = async () => {
    const { data, error } = await supabase.from("tasks").insert({
      title: newTask.title,
      description: newTask.description,
      due_date: newTask.due_date,
      group_id: groupId,
    });

    if (!error) {
      console.log(data);
      fetchTasks();
      setNewTask({ title: "", description: "", due_date: "" });
    }
  };

  const handleFileUpload = async (taskId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });

      if (!result.canceled) {
        setUploading(true);

        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].name;
        const fileSize = result.assets[0].size || 0;

        // Check file size first
        if (fileSize === 0) {
          Alert.alert(
            "Empty File",
            "The file you selected is empty or has zero size."
          );
          setUploading(false);
          return;
        }

        try {
          const response = await fetch(fileUri);
          const fileBlob = await response.blob();

          if (fileBlob.size === 0) {
            Alert.alert("Empty File", "The file content appears to be empty.");
            setUploading(false);
            return;
          }

          const filePath = `submissions/${user?.id}/${Date.now()}-${fileName}`;

          console.log(
            `Uploading file: ${fileName}, Size: ${fileBlob.size} bytes`
          );

          const { data, error: uploadError } = await supabase.storage
            .from("submission-files")
            .upload(filePath, fileBlob, { upsert: true });

          if (uploadError) {
            console.error("Upload failed:", uploadError);
            Alert.alert("Upload Failed", uploadError.message);
            setUploading(false);
            return;
          }

          const { error: insertError } = await supabase
            .from("submissions")
            .upsert(
              {
                task_id: taskId,
                student_id: user?.id,
                file_path: filePath,
                status: "completed", // Using the correct spelling
              },
              { onConflict: "task_id,student_id" }
            );

          if (insertError) {
            console.error("Insert failed:", insertError);
            Alert.alert(
              "Submission Error",
              `Failed to create submission record: ${insertError.message}`
            );
          } else {
            Alert.alert("Success", "File uploaded successfully!");
          }
        } catch (fileError) {
          console.error("File processing error:", fileError);
          Alert.alert("File Error", "Failed to process the selected file.");
        }
      }
    } catch (error) {
      console.error("File upload error:", error);
      Alert.alert("Error", `An unexpected error occurred`);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!currentTaskId || !submissionText.trim()) return;

    const { error } = await supabase.from("submissions").upsert(
      {
        task_id: currentTaskId,
        student_id: user?.id,
        content: submissionText.trim(),
        status: "completed",
      },
      { onConflict: "task_id,student_id" }
    );

    if (!error) {
      setCurrentTaskId(null);
      setSubmissionText("");
      Alert.alert("Success", "Text submission successful!");
    } else {
      console.error("Text submission error:", error);
      Alert.alert("Error", `Text submission failed: ${error.message}`);
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View className="p-4 bg-gray-800 rounded-xl mb-3">
      <Text className="text-white text-lg font-bold">{item.title}</Text>
      <Text className="text-white">{item.description}</Text>
      <Text className="text-gray-400">Due: {item.due_date.split("T")[0]}</Text>

      {userRole === "student" && (
        <View className="mt-2">
          <TouchableOpacity
            onPress={() => handleFileUpload(item.id)}
            disabled={uploading}
          >
            <Text className="text-blue-400">
              {uploading ? "Uploading..." : "Upload File"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrentTaskId(item.id)}>
            <Text className="text-blue-400 mt-2">Submit Text</Text>
          </TouchableOpacity>

          {currentTaskId === item.id && (
            <View className="mt-2">
              <TextInput
                placeholder="Write your solution..."
                value={submissionText}
                onChangeText={setSubmissionText}
                multiline
                className="bg-white text-black p-2 rounded h-24"
              />
              <TouchableOpacity
                onPress={handleTextSubmit}
                className="bg-green-600 p-2 mt-2 rounded"
              >
                <Text className="text-white text-center">Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 p-4 bg-black">
      <Text className="text-white text-2xl mb-4">Group Tasks</Text>

      {userRole && (
        <Text className="text-gray-400 mb-4">Logged in as: {userRole}</Text>
      )}

      {userRole === "teacher" && (
        <View className="mb-6">
          <TextInput
            placeholder="Title"
            value={newTask.title}
            onChangeText={(val) =>
              setNewTask((prev) => ({ ...prev, title: val }))
            }
            className="bg-black text-white border border-white mb-2 p-2 rounded"
          />
          <TextInput
            placeholder="Description"
            value={newTask.description}
            onChangeText={(val) =>
              setNewTask((prev) => ({ ...prev, description: val }))
            }
            className="bg-black text-white border border-white mb-2 p-2 rounded"
          />

          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              if (date) {
                setSelectedDate(date);
                setNewTask((prev) => ({
                  ...prev,
                  due_date: date.toISOString().split("T")[0],
                }));
              }
            }}
          />
          <Button title="Create Task" onPress={handleCreateTask} />
        </View>
      )}

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text className="text-white">No tasks found.</Text>}
      />
    </View>
  );
}
