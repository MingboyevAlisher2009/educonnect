import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import NotificationItem from "../../components/notification-item";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "task" | "submission" | "feedback" | "group" | "system";
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => prev - 1);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      const { error } = await supabase.rpc("mark_all_notifications_read");

      if (error) {
        console.error("Error marking all notifications as read:", error);
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.related_id) {
      switch (notification.type) {
        case "task":
          console.log("Navigate to task:", notification.related_id);
          break;
        case "submission":
          console.log("Navigate to submission:", notification.related_id);
          break;
        case "feedback":
          console.log("Navigate to feedback:", notification.related_id);
          break;
        case "group":
          console.log("Navigate to group:", notification.related_id);
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#f5f7fa]">
      <View className="flex-row justify-between items-center px-4 py-3 bg-[#4285F4]">
        <Text className="text-xl font-bold text-white">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            className="py-1.5 px-3 bg-white/20 rounded-full"
            onPress={markAllAsRead}
          >
            <Text className="text-white text-xs font-medium">
              Mark all as read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text className="mt-4 text-base text-gray-600 text-center">
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerClassName="p-3"
        />
      )}
    </View>
  );
}
