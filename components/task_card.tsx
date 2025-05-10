import { useAuth } from "@/providers/AuthProvider";
import React from "react";
import { Image, Text, View } from "react-native";

type TaskCardProps = {
  submission: {
    task: {
      title: string;
    };
    student: {
      email: string;
    };
    submitted_at: string;
    file_path?: string;
    rating?: number | null;
    feedback?: string | null;
    content: string;
  };
};

export default function TaskCard({ submission }: TaskCardProps) {
  const { task, student, submitted_at, file_path, rating, feedback, content } =
    submission;
  const { user } = useAuth();

  return (
    <View className="bg-white dark:bg-[#1f1f1f] p-6 rounded-xl shadow-md">
      <Text className="text-xl font-semibold text-black dark:text-white mb-2">
        📄 {task?.title}
      </Text>

      {user?.condidate_role === "teacher" && (
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          💬 {content}
        </Text>
      )}

      {user?.condidate_role === "teacher" && (
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          👤 {student?.email}
        </Text>
      )}

      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        ⏰ {new Date(submitted_at).toLocaleString()}
      </Text>

      {/* Display image if file_path exists */}
      {file_path && (
        <Image
          source={{
            uri: `https://${process.env.EXPO_PUBLIC_SUPABASE_URL}.storage/v1/object/public/${file_path}`,
          }}
          className="h-40 w-full rounded-lg mt-4"
          resizeMode="cover"
        />
      )}

      {user?.condidate_role === "student" && (
        <View className="mt-4">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            ⭐ Rating: {rating ? rating : "Not rated"}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            💬 Feedback: {feedback ? feedback : "No feedback given"}
          </Text>
        </View>
      )}
    </View>
  );
}
