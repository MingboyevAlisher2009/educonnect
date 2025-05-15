import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Calendar, DateObject } from "react-native-calendars";

type Task = {
  id: string;
  title: string;
  due_date: string;
  group_id: string;
  group: Group;
  status?: "completed" | "locked" | "pending";
};

type Group = {
  id: string;
  name: string;
};

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "light";
  const today = new Date().toISOString().split("T")[0];

  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchGroups();
      fetchTasks();
    }
  }, [user?.id, selectedGroupId]);

  const fetchGroups = async () => {
    if (user?.condidate_role !== "teacher") return;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name")
      .eq("teacher_id", user.id);

    if (error) {
      console.log(error);
      return;
    }

    setGroups(data || []);
  };

  const fetchTasks = async () => {
    try {
      let query = supabase.from("tasks").select(`*, group:groups(id, name)`);

      if (user?.condidate_role === "teacher") {
        if (selectedGroupId) {
          query = query.eq("group_id", selectedGroupId);
        } else {
          console.log("No group selected for teacher.");
          return;
        }
      } else if (user?.condidate_role === "student") {
        const { data: groups, error: groupsError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("student_id", user.id);

        if (groupsError) {
          console.error("Error fetching groups:", groupsError);
          return;
        }

        if (groups && groups.length > 0) {
          const groupIds = groups.map((group) => group.group_id);
          query = query.in("group_id", groupIds);
        } else {
          console.log("Student is not part of any groups.");
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const fetchedTasks = data;
      setTasks(fetchedTasks);

      markDates(fetchedTasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const markDates = (tasks: Task[]) => {
    const newMarks: Record<string, any> = {};

    tasks.forEach((task) => {
      const date = task.due_date.split("T")[0];
      const statusColor =
        user?.condidate_role === "student"
          ? task.status === "completed"
            ? "#10B981"
            : "#EF4444"
          : "#F59E0B";

      newMarks[date] = {
        ...(newMarks[date] || {}),
        marked: true,
        dotColor: statusColor,
      };
    });

    newMarks[selectedDate] = {
      ...(newMarks[selectedDate] || {}),
      selected: true,
      selectedColor: "#3B82F6",
    };

    setMarkedDates(newMarks);
  };

  const tasksForDate = tasks.filter(
    (task) => task.due_date.split("T")[0] === selectedDate
  );

  return (
    <View className={`flex-1 px-4 pt-12  bg-white`}>
      <Text className={`text-2xl font-semibold mb-4 text-gray-900`}>
        Calendar
      </Text>

      {user?.condidate_role === "teacher" && (
        <View className="flex-row mb-4 flex-wrap">
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              onPress={() => setSelectedGroupId(group.id)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                selectedGroupId === group.id ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <Text
                className={
                  selectedGroupId === group.id ? "text-white" : "text-black"
                }
              >
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Calendar
        markedDates={markedDates}
        onDayPress={(day: DateObject) => {
          setSelectedDate(day.dateString);
          setModalVisible(true);
        }}
        theme={{
          backgroundColor: "#FFFFFF",
          calendarBackground: "#FFFFFF",
          textSectionTitleColor: "#9CA3AF",
          selectedDayBackgroundColor: "#3B82F6",
          selectedDayTextColor: "#FFFFFF",
          todayTextColor: "#3B82F6",
          dayTextColor: isDark ? "#E5E7EB" : "#111827",
          textDisabledColor: "#6B7280",
          arrowColor: "#3B82F6",
          monthTextColor: "#111827",
          textDayFontWeight: "500",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "600",
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <View className="mt-10 flex-1">
        <FlatList
          data={tasksForDate}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              key={item.id}
              className="bg-white rounded-xl shadow p-4 mt-5 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 rounded-full p-4 mr-2">
                  <Ionicons name="document-outline" size={24} color="#3b82f6" />
                </View>
                <View>
                  <Text className="text-lg font-semibold text-gray-800">
                    {item.group.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-gray-500 ml-1 text-sm">
                      {item.title}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-gray-500 dark:text-gray-400">
              No tasks found.
            </Text>
          }
          contentContainerStyle={{ padding: 5, marginBottom: 10 }}
        />
      </View>
    </View>
  );
}
