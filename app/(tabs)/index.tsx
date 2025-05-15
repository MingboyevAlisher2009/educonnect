import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type {
  CardProps,
  GroupType,
  SectionProps,
  SubmissionType,
} from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistance, isTomorrow } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [tasks, setTasks] = useState<SubmissionType[]>([]);
  const [submission, setSubmission] = useState<SubmissionType[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(() => {
    setRefreshing(true);
    try {
      fetchGroups();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchGroups = async () => {
    if (!user) return;

    const { data, error } =
      user.condidate_role === "teacher"
        ? await supabase
            .from("groups")
            .select(`*, teacher:profiles(id, email, condidate_role)`)
            .eq("teacher_id", user.id)
        : await supabase
            .from("group_members")
            .select(
              `group:groups(*, teacher:profiles(id, email, condidate_role))`
            )
            .eq("student_id", user.id);

    if (error) {
      console.error(error);
      return;
    }

    const groupsData =
      user.condidate_role === "student"
        ? data.map((item) => item.group)
        : data || [];

    setGroups(groupsData);

    if (groupsData.length) {
      fetchTasks(groupsData);
      fetchSubmission(groupsData);
    } else {
      setTasks([]);
      setSubmission([]);
    }
  };

  const fetchTasks = async (groupsData: GroupType[]) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`*, group:groups(id, name)`)
      .in(
        "group_id",
        groupsData.map((group) => group.id)
      )
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    const now = new Date();
    setTasks(data?.filter((task) => new Date(task.due_date) > now) ?? []);
  };

  const fetchSubmission = async (groupsData: GroupType[]) => {
    const { data, error } =
      user?.condidate_role === "teacher"
        ? await supabase
            .from("submissions")
            .select(
              `*, task:tasks(id, title, group_id, due_date), student:profiles(id, email)`
            )
            .in(
              "task.group_id",
              groupsData.map((group) => group.id)
            )
            .order("submitted_at", { ascending: false })

            .limit(3)
        : await supabase
            .from("submissions")
            .select(
              `*, task:tasks(id, title, group_id,file_path, due_date), student:profiles(id, email)`
            )
            .eq("student_id", user?.id)
            .eq("status", "completed")
            .order("submitted_at", { ascending: false })
            .limit(3);

    if (error) {
      console.error("Fetch submission error:", error);
      return;
    }

    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    setSubmission(
      user?.condidate_role === "teacher"
        ? data?.filter((submission) => {
            const dueDate = new Date(submission.task?.due_date);
            return (
              dueDate.getTime() - now.getTime() <= oneWeekInMs && dueDate > now
            );
          }) ?? []
        : data
    );
  };

  const handleRefresh = () => {
    fetchData();
  };

  useFocusEffect(fetchData);

  return (
    <FlatList
      data={submission}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListHeaderComponent={
        <View className="flex-1 bg-[#fbf9fe]">
          <View className="bg-blue-500 p-4 pb-16 pt-10 rounded-b-[3rem]">
            <Text className="text-white text-xl font-bold">
              Salom, {user?.email?.split("@")[0] || "teacher"}
            </Text>
            <Text className="text-white text-sm mt-1">
              {user?.condidate_role === "teacher" ? "Teacher" : "Student"}
            </Text>
          </View>

          <View className="flex-row justify-between px-4 -mt-10">
            <Card
              icon={<Ionicons name="book-outline" color="#4c82e3" size={20} />}
              number={groups.length || 0}
              label="Guruhlar"
              bg="bg-[#dbe9ff]"
            />
            <Card
              icon={<Ionicons name="alarm-outline" size={20} color="#8b63ed" />}
              number={tasks.length || 0}
              label="Yaqin vazifalar"
              bg="bg-[#eee9ff]"
            />
            <Card
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#41a684"
                />
              }
              number={submission.length || 0}
              label={
                user?.condidate_role === "teacher"
                  ? "Oxirgi javoblar"
                  : "Javoblar"
              }
              bg="bg-[#d2f9e6]"
            />
          </View>
          <View className="px-4 py-4">
            <Text className="text-2xl font-bold mb-4">
              Yaqinlashgan vazifalar
            </Text>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <View
                  key={task.id}
                  className="bg-white p-5 rounded-2xl mb-4 shadow-sm"
                >
                  <Text className="text-2xl font-bold">{task.group.name}</Text>
                  <Text className="text-lg text-gray-500">{task.title}</Text>
                  <Text className="text-lg text-gray-500 mt-2">
                    {task.description}
                  </Text>
                  <Text className="text-gray-500 mt-2 flex-row items-center">
                    <Ionicons name="calendar-outline" size={16} /> Muddat:{" "}
                    {format(new Date(task.due_date), "dd MMM")}
                  </Text>
                  {isTomorrow(new Date(task.due_date)) && (
                    <Text className="text-yellow-500 mt-1 flex-row items-center">
                      <Ionicons name="alarm-outline" size={16} />{" "}
                      {formatDistance(new Date(task.due_date), new Date())}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Section
                title="Yaqinlashgan Vazifalar"
                message="Yaqinlashgan vazifalar yo'q"
              />
            )}

            {submission.length === 0 && (
              <Section
                title={
                  user?.condidate_role === "teacher"
                    ? "Oxirgi javoblar"
                    : "So'ngi faollik"
                }
                message={
                  user?.condidate_role === "teacher"
                    ? "Oxirgi javoblar yo'q"
                    : "Javoblar topilmadi."
                }
              />
            )}
            {!!submission.length && (
              <Text className="text-2xl font-bold mb-4">Oxirgi javoblar</Text>
            )}
          </View>
        </View>
      }
      renderItem={({ item }) => <SubmissionItem submission={item} />}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

const SubmissionItem = ({ submission }: { submission: any }) => {
  const router = useRouter();
  const getSubmissionFileUrl = () => {
    if (!submission?.file_path) return null;

    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/submission-files/${submission.file_path}`;
  };
  return (
    <TouchableOpacity className="bg-white rounded-2xl shadow-sm p-5 mx-4 mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xl font-semibold text-black">
          {submission.task.title}
        </Text>
        <Text className="text-base text-gray-500">
          {submission.task.due_date.split("T")[0]}
        </Text>
      </View>
      <Text className="text-sm text-gray-500">{submission.content}</Text>
      {submission.file_path && (
        <TouchableOpacity
          onPress={() => {
            const url = getSubmissionFileUrl();
            if (url) {
              router.push(url);
            }
          }}
          className="mt-5 p-3 border border-blue-500 bg-blue-300 rounded"
        >
          <Text className="text-center text-blue-500">Filni ko'rish</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const Card = ({ icon, number, label, bg }: CardProps) => (
  <View className="bg-white rounded-xl shadow-sm p-4 mx-1 flex-1">
    <View
      className={`w-14 h-14 ${bg} rounded-full justify-center items-center mb-2 mx-auto`}
    >
      {icon}
    </View>
    <Text className="text-xl font-bold text-center">{number}</Text>
    <Text className="text-sm text-gray-500 text-center">{label}</Text>
  </View>
);

const Section = ({ title, message }: SectionProps) => (
  <View className="mt-2 mb-4">
    <Text className="text-base font-semibold mb-2">{title}</Text>
    <View className="bg-white rounded-xl p-6 shadow-sm">
      <Text className="text-gray-400 text-center">{message}</Text>
    </View>
  </View>
);
