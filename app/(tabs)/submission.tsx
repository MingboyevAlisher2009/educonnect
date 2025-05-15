"use client";

import RateSubmissionModal from "@/components/rate_subsission_modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Submission = {
  id: string;
  student_id: string;
  task_id: string;
  content: string;
  rating: number | null;
  feedback: string | null;
  submitted_at: string;
  student: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  task: {
    id: string;
    title: string;
    group_id: string;
    group: {
      id: string;
      name: string;
    };
  };
};

export default function SubmissionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionIds, setSubmissionIds] = useState({
    id: "",
    taskId: "",
    studentId: "",
  });
  const [modalVisible, setModalVisible] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          `
          *,
          student:profiles(id, email),
          task:tasks(id, title, group_id, group:groups(id, name))
        `
        )
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
        return;
      }

      setSubmissions(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleRate = async (info: { rating: number; feedback: string }) => {
    try {
      if (!submissionIds.id) return Alert.alert("Not found", "Id is required");

      const { error } = await supabase.from("submissions").upsert(
        {
          id: submissionIds.id,
          task_id: submissionIds.taskId,
          student_id: submissionIds.studentId,
          rating: info.rating,
          feedback: info.feedback,
          status: "completed",
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("Error in upsert:", error);
        return Alert.alert(
          "Rate",
          "Something went wrong while updating the submission."
        );
      }
      setModalVisible(false);
      fetchSubmissions();
    } catch (error) {
      Alert.alert("Rate", "Something went wrong.");
      console.error(error);
    }
  };

  const handleRefresh = () => {
    fetchSubmissions();
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubmissions();
      return () => {};
    }, [fetchSubmissions])
  );

  const getStudentName = (submission: Submission) => {
    if (submission.student.first_name) {
      return submission.student.first_name.toLowerCase();
    }
    return submission.student.email.split("@")[0].toLowerCase();
  };

  const renderSubmissionItem = ({ item }: { item: Submission }) => (
    <TouchableOpacity
      onPress={() => {
        if (user?.condidate_role === "teacher") {
          setSubmissionIds({
            id: item.id,
            studentId: item.student_id,
            taskId: item.task_id,
          });
          setModalVisible(true);
        }
      }}
      className="bg-white rounded-xl p-4 mb-4 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-xl font-semibold">{item.task.title}</Text>
        {user?.condidate_role === "teacher" && (
          <Text className="text-gray-500">{item.task.group.name}</Text>
        )}
      </View>

      {user?.condidate_role === "teacher" && (
        <Text className="text-blue-500 mb-1 font-bold">
          {getStudentName(item)}
        </Text>
      )}
      <Text className="text-gray-500 text-sm mb-2">
        {format(new Date(item.submitted_at), "dd/MM/yyyy")}
      </Text>

      {user?.condidate_role === "teacher" && (
        <Text className="text-gray-700 mb-3">{item.content}</Text>
      )}

      {item.rating ? (
        <View className="flex-row items-center">
          <Ionicons name="star" size={16} color="#f79d00" />
          <Text className="ml-1 text-[#f79d00] font-bold">
            {item.rating || 0}/{5}
          </Text>
        </View>
      ) : (
        <TouchableOpacity className="px-5 py-2 border flex-row justify-center rounded">
          <Ionicons name="star-outline" color={"#f79d00"} />
          <Text className="text-[#f79d00] text-center">Baholanmagan</Text>
        </TouchableOpacity>
      )}

      {user?.condidate_role === "student" && (
        <Text className="text-gray-500 text-lg mt-3">
          Ustoz izohi: {item.feedback}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <View className="bg-blue-500 pt-12 pb-4 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          {user?.condidate_role === "teacher" ? "Javoblar" : "Baholar"}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={renderSubmissionItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8">
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text className="text-gray-500 text-center mt-4">
                No submissions found.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        />
      )}
      <RateSubmissionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleRate}
      />
    </View>
  );
}
