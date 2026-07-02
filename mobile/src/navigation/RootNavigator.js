import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext.js";
import MainTabs from "./MainTabs.js";
import LoginScreen from "../screens/auth/LoginScreen.js";
import RegisterScreen from "../screens/auth/RegisterScreen.js";
import LoadingView from "../components/LoadingView.js";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingView label="Loading KejaApp..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: "modal", headerShown: true, title: "Sign in" }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ presentation: "modal", headerShown: true, title: "Create account" }}
      />
    </Stack.Navigator>
  );
}
