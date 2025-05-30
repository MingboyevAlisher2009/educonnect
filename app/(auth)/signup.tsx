import { supabase } from "@/lib/supabase";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RadioGroup from "react-native-radio-buttons-group";

export default function SignUpScreen() {
  const [username, setusername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !role) {
      Alert.alert("Please enter an email, password and role");
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({ email, password });

      if (session) {
        await supabase
          .from("profiles")
          .update({ condidate_role: role, username })
          .eq("id", session.user.id);

        router.replace("/(tabs)");
      }

      if (error) Alert.alert(error.message);

      if (!session)
        Alert.alert("Please check your inbox for email verification!");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const radioButtons = useMemo(
    () => [
      {
        id: "teacher",
        label: "Teacher",
      },
      {
        id: "student",
        label: "Student",
      },
    ],
    []
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 items-center justify-center px-6 bg-white"
    >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-center mb-8 text-black">
          Create an account
        </Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-black mb-1">
              Username
            </Text>
            <TextInput
              className="w-full px-4 py-3 bg-white border border-neutral-500 rounded-lg text-black placeholder:text-gray-500 focus:border-blue-500"
              placeholder="Enter your username"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={username}
              onChangeText={setusername}
            />
          </View>
          <View>
            <Text className="text-sm font-medium text-black mb-1">Email</Text>
            <TextInput
              className="w-full px-4 py-3 bg-white border border-neutral-500 rounded-lg text-black placeholder:text-gray-500 focus:border-blue-500"
              placeholder="Enter your email"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-black mb-1">
              Password
            </Text>
            <TextInput
              className="w-full px-4 py-3 bg-white border border-neutral-500 rounded-lg text-black placeholder:text-gray-500 focus:border-blue-500"
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-black mb-1">Role</Text>
            <RadioGroup
              layout="row"
              labelStyle={{ color: "#000" }}
              radioButtons={radioButtons}
              onPress={setRole}
              selectedId={role}
            />
          </View>

          <TouchableOpacity
            className="w-full bg-blue-500 py-3 rounded-lg mt-6"
            activeOpacity={0.8}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold">
              {isLoading ? "Logging in..." : "Sign up"}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-400">Already have an account? </Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text className="text-blue-400 font-medium">Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
