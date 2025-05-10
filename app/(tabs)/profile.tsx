import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
  const { user } = useAuth();

  return (
    <View className="flex-1 items-center justify-center">
      <View>
        <Text className="text-2xl font-bold text-white">
          Email: {user?.email}
        </Text>
        <Text className="text-2xl font-bold text-white">
          Role: {user?.condidate_role}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => supabase.auth.signOut()}
        className="text-2xl font-bold bg-white p-3 rounded-lg mt-10"
      >
        <Text className="text-2xl font-bold"> Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}
