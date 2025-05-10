import InitialLayout from "@/components/initial_layout";
import { AuthProvider } from "@/providers/AuthProvider";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import "../global.css";

const myTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "white",
    card: "#101010",
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={myTheme}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
