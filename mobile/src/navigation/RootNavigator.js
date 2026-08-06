import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext.js";
import MainTabs from "./MainTabs.js";
import LoginScreen from "../screens/auth/LoginScreen.js";
import RegisterScreen from "../screens/auth/RegisterScreen.js";
import SelectRoleScreen from "../screens/auth/SelectRoleScreen.js";
import LoadingView from "../components/LoadingView.js";
import ColorModeToggle from "../components/ColorModeToggle.js";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingView label="Loading KejaApp..." />;
  }

  // A fresh Google Sign-In account has no role yet - force this screen
  // ahead of the tab navigator regardless of anything else, same as the
  // web frontend's /select-role gating in App.jsx.
  if (user?.roleConfirmed === false) {
    return <SelectRoleScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Sign in",
          headerRight: () => <ColorModeToggle />,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Create account",
          headerRight: () => <ColorModeToggle />,
        }}
      />
    </Stack.Navigator>
  );
}
