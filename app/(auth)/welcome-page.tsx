import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/login");
  };

  const handleSignUp = () => {
    router.push("/signup");
  };

  return (
    <View className="flex-1 justify-center items-center relative">
      <View className="bg-white rounded-3xl p-8 flex-1 justify-center w-full">
        <View className="items-center justify-center mb-6">
          <Ionicons name="book-outline" size={80} color="#3b82f6" />
        </View>
        <Text className="text-2xl font-semibold text-blue-600 text-center mb-4">
          Hamkor Ta'lim
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          O'rganing, O'rgating, Rivojlaning
        </Text>
        <Text className="text-gray-700 text-center mb-8">
          Ta'lim vazifalarini boshqarish va o'quvchi rivojini kuzatishning
          samarali usuli
        </Text>

        <View className="space-y-4">
          <TouchableOpacity
            className="bg-blue-500 rounded-full py-3 w-full active:bg-blue-600"
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text className="text-center text-white font-semibold">
              Boshladik
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-transparent rounded-full py-3 mt-5 w-full border border-blue-500 active:bg-blue-50"
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text className="text-center text-blue-500 font-semibold">
              Ro'yxatdan o'tish
            </Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-5 left-0 right-0 px-8">
          <Text className="text-gray-500 text-center text-sm">
            Samarali ta'lim uchun o'quvchilar va o'qituvchilarni birlashtiramiz
          </Text>
        </View>
      </View>
    </View>
  );
}
