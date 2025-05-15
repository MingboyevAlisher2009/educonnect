import { supabase } from "@/lib/supabase";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Please enter an email and password");
      return;
    }

    try {
      setIsLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (user) {
        router.replace("/(tabs)");
      }

      if (error) Alert.alert(error.message);
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Login error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 items-center justify-center bg-white px-6"
    >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-center mb-8 text-black">
          Welcome Back
        </Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-medium text-black mb-1">Email</Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-500 rounded-lg text-black placeholder:text-gray-500 focus:border-blue-500"
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
              className="w-full px-4 py-3 border border-neutral-500 rounded-lg text-black placeholder:text-gray-500 focus:border-blue-500"
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className="w-full bg-blue-500 py-3 rounded-lg mt-6"
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold">
              {isLoading ? "Logging in..." : "Sign in"}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-400">Don't have an account? </Text>
            <Link href="/signup" asChild>
              <Pressable>
                <Text className="text-blue-500 font-medium">Create one</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
