import CreateGroupModal from "@/components/create_group_modal";
import RateSubmissionModal from "@/components/rate_subsission_modal";
import TaskCard from "@/components/task_card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { GroupType, SubmissionType } from "@/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [search, setSearch] = useState("");
  const [submission, setSubmission] = useState<SubmissionType>();
  const [submissionids, setSubmissionIds] = useState({
    id: "",
    taskId: "",
    studentId: "",
  });

  const handleCreateGroup = async (group: {
    name: string;
    description: string;
    memberIds: string[];
  }) => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: group.name,
          description: group.description,
          teacher_id: user?.id,
        })
        .select();

      if (error || !data?.length) {
        console.error("Error creating group:", error);
        return;
      }

      const groupId = data[0].id;

      if (group.memberIds.length > 0) {
        const inserts = group.memberIds.map((memberId) =>
          supabase.from("group_members").insert({
            group_id: groupId,
            student_id: memberId,
          })
        );

        const results = await Promise.all(inserts);

        const insertErrors = results.filter((res) => res.error);
        if (insertErrors.length > 0) {
          console.error("Some members failed to insert:", insertErrors);
        }
      }
      fetchGroups();
      setVisible(false);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      let data, error;

      if (user?.condidate_role === "teacher") {
        ({ data, error } = await supabase
          .from("groups")
          .select(
            `*,
            teacher:profiles (
              id,
              email,
              condidate_role
            )
          `
          )
          .eq("teacher_id", user?.id));
      } else if (user?.condidate_role === "student") {
        ({ data, error } = await supabase
          .from("group_members")
          .select(
            `group:groups (
              *,
              teacher:profiles (
                id,
                email,
                condidate_role
              )
            )`
          )
          .eq("student_id", user?.id));

        // Extract only the group objects from the result
        data = data?.map((item) => item.group);
      }

      if (error) {
        console.error(error);
        return Alert.alert("Fetch groups", "Something went wrong.");
      }

      setGroups(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const fetchSubmission = async () => {
    try {
      let query = supabase.from("submissions").select(
        `*,
          task:tasks (
            id,
            title,
            group_id
          ),
          student:profiles (
            id,
            email
          )`
      );

      // If the role is 'student', filter submissions that have a rating or feedback
      if (user?.condidate_role === "student") {
        query = query
          .eq("student_id", user?.id)
          .not("rating", "is", null)
          .not("feedback", "is", null);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch submission error:", error);
        return;
      }

      setSubmission(data);
    } catch (err) {
      console.error("Unexpected error in fetchSubmission:", err);
    }
  };

  const handleRate = async (info: { rating: number; feedback: string }) => {
    try {
      if (!submissionids) {
        return Alert.alert("Not found", "Id is reqired");
      }
      const dataToUpdate = {
        id: submissionids.id,
        task_id: submissionids.taskId,
        student_id: submissionids.studentId,
        rating: info.rating,
        feedback: info.feedback,
      };

      const { error } = await supabase
        .from("submissions")
        .upsert(dataToUpdate, { onConflict: "id" });

      if (error) {
        console.error("Error in upsert:", error.message || error);
        Alert.alert(
          "Rate",
          "Something went wrong while updating the submission."
        );
        return;
      }
      return;
    } catch (error) {
      Alert.alert("Rate", "Something went wrong.");
      console.log(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      fetchSubmission();
    }, [])
  );

  const renderItem = ({ item: group }: { item: GroupType }) => (
    <TouchableOpacity
      key={group.id}
      onPress={() => router.replace(`/group/${group.id}`)}
      className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-md p-5 mb-4"
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xl font-semibold text-black dark:text-white">
          {group.name}
        </Text>
        <Text className="text-base text-gray-600 dark:text-gray-400">
          @{group.teacher?.email?.split("@")[0]}
        </Text>
      </View>
      <Text className="text-sm text-gray-700 dark:text-gray-300">
        {group.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-white dark:bg-black">
      <FlatList
        ListHeaderComponent={
          <View className="px-4 pt-4">
            <Text className="text-lg text-gray-500 dark:text-gray-400">
              Welcome back,
            </Text>
            <Text className="text-2xl font-semibold text-black dark:text-white capitalize">
              {user?.email.split("@")[0]}
            </Text>

            <View className="my-6">
              <TextInput
                placeholder="Search tasks or subjects"
                placeholderTextColor={"#A1A1AA"}
                className="bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl px-4 py-3"
                value={search}
                onChangeText={(e) => setSearch(e)}
              />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-semibold text-black dark:text-white">
                Your Groups
              </Text>
              {user?.condidate_role === "teacher" && (
                <TouchableOpacity
                  onPress={() => setVisible(true)}
                  className="bg-blue-600 py-2.5 px-4 rounded-xl"
                >
                  <Text className="text-white font-medium">Create Group</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        data={groups.filter(
          (group) =>
            group.name.toLowerCase().includes(search.toLowerCase()) ||
            group.description.toLowerCase().includes(search.toLowerCase())
        )}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 dark:text-gray-400 mt-10">
            No groups found.
          </Text>
        }
      />

      <View className="px-4">
        <Text className="text-2xl font-semibold text-black dark:text-white mb-4">
          {user?.condidate_role === "teacher" ? "Submissions" : "Ratings"}
        </Text>
        <FlatList
          data={submission}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (user?.condidate_role === "student") return;
                setSubmissionIds({
                  id: item.id,
                  taskId: item.task_id,
                  studentId: item.student_id,
                });
                setShowRateModal(true);
              }}
              className="mb-4"
            >
              <TaskCard submission={item} />
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 dark:text-gray-400 mt-10">
              No submission found.
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <RateSubmissionModal
        visible={showRateModal}
        onClose={() => setShowRateModal(false)}
        onSubmit={(data) => handleRate(data)}
      />
      <CreateGroupModal
        visible={visible}
        onClose={() => setVisible(false)}
        onCreate={handleCreateGroup}
      />
    </View>
  );
}
