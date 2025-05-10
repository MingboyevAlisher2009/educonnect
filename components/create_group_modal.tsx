import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (group: {
    name: string;
    description: string;
    memberIds: string[];
  }) => void;
};

type Student = {
  id: string;
  email: string;
};

export default function CreateGroupModal({
  visible,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (visible) {
      fetchStudents();
    }
  }, [visible]);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("condidate_role", "student");

    if (error) {
      Alert.alert("Error", "Failed to fetch students.");
    } else {
      setStudents(data || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Group name is required.");
      return;
    }

    onCreate({ name, description, memberIds: selectedIds });
    setName("");
    setDescription("");
    setSelectedIds([]);
  };

  const filteredStudents = students.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/40">
        <View className="bg-black w-[90%] p-6 rounded-2xl max-h-[90%]">
          <Text className="text-xl font-bold mb-4 text-white">
            Create Group
          </Text>

          <TextInput
            placeholder="Group Name"
            value={name}
            onChangeText={setName}
            className="border border-white rounded-lg px-3 py-2 mb-3 text-white placeholder:text-white/50"
          />

          <TextInput
            placeholder="Group Description"
            value={description}
            onChangeText={setDescription}
            className="border border-white rounded-lg px-3 py-2 mb-4 text-white placeholder:text-white/50"
            multiline
          />

          <Text className="text-white mb-2">Add Members</Text>
          <TextInput
            placeholder="Search students..."
            value={search}
            onChangeText={setSearch}
            className="border border-white rounded-lg px-3 py-2 mb-3 text-white placeholder:text-white/50"
          />

          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 200 }}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggleSelect(item.id)}
                  className={`p-2 rounded-lg mb-1 ${
                    selected ? "bg-blue-600" : "bg-white/10"
                  }`}
                >
                  <Text className="text-white">({item.email})</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text className="text-white/50">No students found</Text>
            }
          />

          <View className="flex-row justify-end gap-4 mt-4">
            <Pressable
              onPress={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg"
            >
              <Text>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-white">Create</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
