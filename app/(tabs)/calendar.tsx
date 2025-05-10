import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
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
  status?: "completed" | "locked" | "pending";
};

type Group = {
  id: string;
  name: string;
};

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
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
      let query = supabase.from("tasks").select("*");

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
      console.log("Fetched Tasks:", fetchedTasks);
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
    <View className={`flex-1 px-4 pt-12 ${isDark ? "bg-black" : "bg-white"}`}>
      <Text
        className={`text-2xl font-semibold mb-4 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
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
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
          calendarBackground: isDark ? "#000000" : "#FFFFFF",
          textSectionTitleColor: "#9CA3AF",
          selectedDayBackgroundColor: "#3B82F6",
          selectedDayTextColor: "#FFFFFF",
          todayTextColor: "#3B82F6",
          dayTextColor: isDark ? "#E5E7EB" : "#111827",
          textDisabledColor: "#6B7280",
          arrowColor: "#3B82F6",
          monthTextColor: isDark ? "#F3F4F6" : "#111827",
          textDayFontWeight: "500",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "600",
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-white dark:bg-black px-4 pt-12">
          <Text className="text-xl font-bold mb-4 dark:text-white">
            Tasks on {selectedDate}
          </Text>

          <FlatList
            data={tasksForDate}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="p-4 border-b border-gray-300">
                <Text className="text-lg font-medium dark:text-white">
                  {item.title}
                </Text>
                {user?.condidate_role === "student" && (
                  <Text
                    className={`text-sm ${
                      item.status === "completed"
                        ? "text-green-500"
                        : item.status === "pending"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {item.status}
                  </Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text className="text-gray-500 dark:text-gray-400">
                No tasks found.
              </Text>
            }
          />

          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            className="mt-4 bg-blue-600 py-3 px-6 rounded-xl self-center"
          >
            <Text className="text-white text-center">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
