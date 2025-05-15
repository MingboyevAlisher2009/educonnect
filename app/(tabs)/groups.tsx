import CreateTaskModal from "@/components/create-task-modal";
import CreateGroupModal from "@/components/create_group_modal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { IGroup, SubmissionType } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function MyGroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<IGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [task, setTask] = useState<SubmissionType | null>(null);
  const [groupId, setGroupId] = useState("");
  const [studentModal, setStudentModal] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } =
        user.condidate_role === "teacher"
          ? await supabase
              .from("groups")
              .select(`*, tasks:tasks(id, title,description, due_date)`)
              .eq("teacher_id", user.id)
          : await supabase
              .from("group_members")
              .select(
                `group:groups(*, tasks:tasks(id, title,description, due_date))`
              )
              .eq("student_id", user.id);
      console.log(data);

      if (error) {
        console.error("Error fetching groups:", error);
        Alert.alert("Error", "Failed to load groups");
        return;
      }

      let processedGroups = [];
      if (user.condidate_role === "teacher") {
        processedGroups = data.map((group) => ({
          ...group,
          tasks_count: group.tasks ? group.tasks.length : 0,
        }));
      } else {
        processedGroups = data.map((item) => ({
          ...item.group,
          tasks_count: item.group.tasks ? item.group.tasks.length : 0,
        }));
      }

      setGroups(processedGroups);
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleAddGroup = () => {
    if (user?.condidate_role === "teacher") {
      setCreateModalVisible(true);
    } else {
      setStudentModal(true);
    }
  };

  const handleRefresh = () => {
    fetchGroups();
  };

  const toggleAccordion = (id: string) => {
    setOpenGroupId((prev) => (prev === id ? null : id));
  };

  const handleGroupPress = (group: IGroup) => {
    if (user?.condidate_role === "teacher") {
      setSelectedGroup(group);
      setModalVisible(true);
    } else {
      return;
    }
  };

  const handleTaskCreated = () => {
    fetchGroups();
    setTask(null);
  };

  const handleJoinGroup = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        student_id: user?.id,
      });

      if (error) {
        return Alert.alert(
          "Joining Group",
          "Something went wrong. Please try again."
        );
      }
      fetchGroups();
      setStudentModal(false);
    } catch (error) {
      console.log(error);
      Alert.alert("Joining Group", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    setIsSubmitting(true);
    try {
      await supabase
        .from("groups")
        .insert({ name, description, teacher_id: user?.id });
      fetchGroups();
      setCreateModalVisible(false);
    } catch (error) {
      Alert.alert("Creating error", "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Nusxa", "Guruh ID sidan nuxa olindi.");
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      return () => {};
    }, [fetchGroups])
  );

  const renderGroupItem = ({ item }: { item: IGroup }) => (
    <>
      <View className="bg-white rounded-3xl p-6 mb-4 shadow-md">
        <View className="mb-2">
          <TouchableOpacity onPress={() => handleGroupPress(item)}>
            <View className="w-16 h-16 bg-blue-100 rounded-full justify-center items-center mr-3">
              <Ionicons name="people-outline" size={34} color="#4285F4" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl mt-2 font-semibold">{item.name}</Text>
              <Text className="text-gray-500 mt-4">{item.description}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text className="text-gray-500 text-sm mb-2">
          Yaratilgan: {format(new Date(item.created_at), "MMM d, yyyy")}
        </Text>

        {user?.condidate_role === "teacher" && (
          <TouchableOpacity
            onPress={() => copyText(item.id)}
            className="bg-blue-100 p-2 rounded-md"
          >
            <Text className="text-blue-800 text-xs">ID: {item.id}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="bg-white px-5 rounded-3xl">
        {!!item.tasks_count && (
          <>
            <TouchableOpacity
              onPress={() => toggleAccordion(item.id)}
              className="flex-row justify-between items-center border-b py-5 border-gray-300 rounded-lg"
            >
              <Text className="text-gray-700 text-lg font-medium">
                Vazifalar ({item.tasks_count})
              </Text>
              <Ionicons
                name={openGroupId === item.id ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {openGroupId === item.id && (
              <View className="p-4 w-full space-y-5">
                {item.tasks?.map((task, idx) => (
                  <TouchableOpacity
                    onPress={() => {
                      if (user?.condidate_role === "teacher") {
                        setModalVisible(true);
                        setSelectedGroup(item);
                        setTask(task);
                      } else {
                        router.push({
                          pathname: "/task",
                          params: { taskId: task.id },
                        });
                      }
                    }}
                    key={idx}
                    className="bg-white rounded-xl p-4 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center">
                      <View className="bg-blue-100 rounded-lg p-2 mr-2">
                        <Ionicons
                          name="document-outline"
                          size={20}
                          color="#3b82f6"
                        />
                      </View>
                      <View>
                        <Text className="text-lg font-semibold text-gray-800">
                          {task.title}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="gray"
                          />
                          <Text className="text-gray-500 ml-1 text-sm">
                            Muddati:{" "}
                            {format(new Date(task.due_date), "MMM dd yyyy")}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="pencil-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </>
  );

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <View className="bg-blue-500 pt-12 pb-4 px-4 flex-row justify-between items-center">
        <Text className="text-white text-xl font-bold">Mening guruhlarim</Text>

        <TouchableOpacity
          className="w-10 h-10 bg-blue-400 rounded-full justify-center items-center"
          onPress={handleAddGroup}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8">
              <Ionicons name="school-outline" size={48} color="#ccc" />
              <Text className="text-gray-500 text-center mt-4">
                No groups found.{" "}
                {user?.condidate_role === "teacher" &&
                  "Tap the + button to create a new group."}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
          }
        />
      )}

      {selectedGroup && (
        <CreateTaskModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setTask(null);
          }}
          groupId={selectedGroup.id}
          groupInfo={task}
          onTaskCreated={handleTaskCreated}
        />
      )}

      <CreateGroupModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        isSubmitting={isSubmitting}
        onCreate={handleCreateGroup}
      />
      <Modal visible={studentModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-2xl font-bold text-center mb-6">
              Join Group
            </Text>

            <View className="mb-4">
              <Text className="text-gray-700 mb-1">Group ID</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter task title"
                value={groupId}
                onChangeText={setGroupId}
              />
            </View>
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 mr-2 py-3 border border-gray-300 rounded-lg items-center"
                onPress={() => setStudentModal(false)}
                disabled={isSubmitting}
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 ml-2 py-3 bg-blue-500 rounded-lg items-center"
                onPress={handleJoinGroup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-medium">Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
