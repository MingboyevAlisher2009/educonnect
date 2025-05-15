import { useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, FlatList, Animated, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/providers/AuthProvider"
import NotificationItem from "./notification-item"
import NotificationBadge from "./notification-badge"

type Notification = {
  id: string
  title: string
  message: string
  type: "task" | "submission" | "feedback" | "group" | "system"
  related_id: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const screenHeight = Dimensions.get("window").height

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    } catch (error) {
      console.error("Unexpected error:", error)
    }
  }

  const toggleNotificationCenter = () => {
    const toValue = isOpen ? 0 : 1

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start()

    setIsOpen(!isOpen)

    if (!isOpen) {
      fetchNotifications()
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) {
        console.error("Error marking notification as read:", error)
        return
      }

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => prev - 1)
    } catch (error) {
      console.error("Unexpected error:", error)
    }
  }

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Handle navigation based on notification type
    toggleNotificationCenter() // Close the panel
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()

      const subscription = supabase
        .channel("notifications_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications()
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenHeight * 0.5, 0],
  })

  return (
    <View className="relative">
      <TouchableOpacity className="w-10 h-10 justify-center items-center" onPress={toggleNotificationCenter}>
        <Ionicons name="notifications-outline" size={24} color="#4285F4" />
        {unreadCount > 0 && (
          <View className="absolute top-1 right-1">
            <NotificationBadge count={unreadCount} size="small" />
          </View>
        )}
      </TouchableOpacity>

      {isOpen && (
        <TouchableOpacity
          className="absolute top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/30 z-10"
          onPress={toggleNotificationCenter}
          activeOpacity={1}
          style={{ transform: [{ translateY: -40 }] }}
        />
      )}

      <Animated.View
        className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl z-20 overflow-hidden"
        style={{ transform: [{ translateY }] }}
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
          <Text className="text-lg font-bold">Notifications</Text>
          <TouchableOpacity onPress={toggleNotificationCenter}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View className="py-8 px-4 items-center">
            <Ionicons name="notifications-off-outline" size={40} color="#ccc" />
            <Text className="mt-2 text-gray-500 text-center">No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem notification={item} onPress={() => handleNotificationPress(item)} />
            )}
            className="max-h-96"
          />
        )}

        <TouchableOpacity
          className="p-4 border-t border-gray-200 items-center"
          onPress={() => {
            toggleNotificationCenter()
            // Navigate to full notifications page
          }}
        >
          <Text className="text-[#4285F4] font-medium">View All</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}
