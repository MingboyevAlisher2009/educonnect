import { View, Text } from "react-native"

type NotificationBadgeProps = {
  count: number
  size?: "small" | "medium" | "large"
}

export default function NotificationBadge({ count, size = "medium" }: NotificationBadgeProps) {
  if (count === 0) return null

  const displayCount = count > 99 ? "99+" : count.toString()

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "min-w-4 h-4",
          text: "text-[10px]",
        }
      case "large":
        return {
          container: "min-w-6 h-6",
          text: "text-sm",
        }
      case "medium":
      default:
        return {
          container: "min-w-5 h-5",
          text: "text-xs",
        }
    }
  }

  const { container, text } = getSizeClasses()

  return (
    <View
      className={`${container} ${displayCount.length > 1 ? "px-1" : ""} bg-[#EA4335] rounded-full justify-center items-center`}
    >
      <Text className={`${text} text-white font-bold px-0.5`}>{displayCount}</Text>
    </View>
  )
}
