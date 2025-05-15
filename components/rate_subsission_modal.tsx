import React, { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RateSubmissionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: { rating: number; feedback: string }) => void;
};

const RateSubmissionModal: React.FC<RateSubmissionModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  const handleRate = (value: number) => setRating(value);

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ rating, feedback });
    }
    setRating(0);
    setFeedback("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={onClose}
      >
        <Pressable
          className="w-[90%] bg-white rounded-xl p-6"
          onPress={() => {}}
        >
          <Text className="text-xl font-semibold mb-4 text-black">
            Rate Submission
          </Text>

          {/* Stars */}
          <View className="flex-row justify-center mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity key={num} onPress={() => handleRate(num)}>
                <Text
                  className={`text-3xl mx-1 ${
                    rating >= num ? "text-yellow-400" : "text-gray-400"
                  }`}
                >
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback */}
          <TextInput
            placeholder="Write your feedback..."
            placeholderTextColor="#A1A1AA"
            multiline
            className="bg-gray-100 text-black rounded-xl px-4 py-3 h-24"
            value={feedback}
            onChangeText={setFeedback}
          />

          {/* Buttons */}
          <View className="flex-row justify-end mt-6 space-x-3">
            <TouchableOpacity
              onPress={onClose}
              className="px-4 py-2 bg-gray-300 rounded-lg"
            >
              <Text className="text-black">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-white">Submit</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default RateSubmissionModal;
