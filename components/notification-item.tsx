import { View, Text, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatDistanceToNow } from "date-fns"

type NotificationType = "task" | "submission" | "feedback" | "group" | "system"

type NotificationProps = {
  notification: {
    id: string
    title: string
    message: string
    type: NotificationType
    is_read: boolean
    created_at: string
  }
  onPress: () => void
}

export default function NotificationItem({ notification, onPress }: NotificationProps) {
  const getIconName = (type: NotificationType): string => {
    switch (type) {
      case "task":
        return "calendar-outline"
      case "submission":
        return "document-text-outline"
      case "feedback":
        return "star-outline"
      case "group":
        return "people-outline"
      case "system":
        return "information-circle-outline"
      default:
        return "notifications-outline"
    }
  }

  const getIconColor = (type: NotificationType): string => {
    switch (type) {
      case "task":
        return "#4285F4" 
      case "submission":
        return "#34A853" 
      case "feedback":
        return "#FBBC05" 
      case "group":
        return "#EA4335" 
      case "system":
        return "#9AA0A6"
      default:
        return "#4285F4" 
    }
  }

  const getIconBackground = (type: NotificationType): string => {
    switch (type) {
      case "task":
        return "#E8F0FE" // Light Blue
      case "submission":
        return "#E6F4EA" // Light Green
      case "feedback":
        return "#FEF7E0" // Light Yellow
      case "group":
        return "#FCE8E6" // Light Red
      case "system":
        return "#F1F3F4" // Light Gray
      default:
        return "#E8F0FE" // Light Blue
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  })

  return (
    <TouchableOpacity
      className={`flex-row p-4 rounded-xl mb-2 items-center ${
        notification.is_read ? "bg-[#f9f9f9]" : "bg-white shadow-sm"
      }`}
      onPress={onPress}
    >
      <View
        className="w-12 h-12 rounded-full justify-center items-center mr-4"
        style={{ backgroundColor: getIconBackground(notification.type) }}
      >
        <Ionicons name={getIconName(notification.type)} size={24} color={getIconColor(notification.type)} />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${notification.is_read ? "font-normal text-gray-600" : "font-bold text-gray-900"}`}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text className="text-sm text-gray-600 mb-1" numberOfLines={2}>
          {notification.message}
        </Text>
        <Text className="text-xs text-gray-500">{timeAgo}</Text>
      </View>
      {!notification.is_read && <View className="w-2.5 h-2.5 rounded-full bg-[#4285F4] ml-2" />}
    </TouchableOpacity>
  )
}
