import { useEffect, useState } from "react"
import { TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/providers/AuthProvider"
import NotificationBadge from "./notification-badge"

export default function NotificationIcon() {
  const router = useRouter()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    if (!user) return

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        console.error("Error fetching unread count:", error)
        return
      }

      setUnreadCount(count || 0)
    } catch (error) {
      console.error("Unexpected error:", error)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchUnreadCount()

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
          fetchUnreadCount()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const handlePress = () => {
    router.push("/notifications")
  }

  return (
    <TouchableOpacity className="w-10 h-10 justify-center items-center" onPress={handlePress}>
      <Ionicons name="notifications-outline" size={24} color="#4285F4" />
      {unreadCount > 0 && (
        <View className="absolute top-1 right-1">
          <NotificationBadge count={unreadCount} size="small" />
        </View>
      )}
    </TouchableOpacity>
  )
}
