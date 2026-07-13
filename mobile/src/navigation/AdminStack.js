import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminScreen from "../screens/admin/AdminScreen.js";
import AdminUserDetailScreen from "../screens/admin/AdminUserDetailScreen.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="AdminList"
        component={AdminScreen}
        options={{ title: "Admin", headerRight: () => <ColorModeToggle /> }}
      />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: "User" }} />
    </Stack.Navigator>
  );
}
