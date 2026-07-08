import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";
import WorkspaceScreen from "../screens/workspace/WorkspaceScreen.js";
import PropertyCreateScreen from "../screens/workspace/PropertyCreateScreen.js";
import { useAuth } from "../context/AuthContext.js";
import colors from "../theme/colors.js";

const Stack = createNativeStackNavigator();
const listingManagerRoles = ["landlord", "agency"];

export default function WorkspaceStack() {
  const { user, signedIn } = useAuth();
  const canManageListings = signedIn && listingManagerRoles.includes(user?.role);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="WorkspaceList"
        component={WorkspaceScreen}
        options={({ navigation }) => ({
          title: "Workspace",
          headerRight: canManageListings
            ? () => (
                <Pressable onPress={() => navigation.navigate("PropertyCreate")} hitSlop={10}>
                  <Text style={{ color: colors.greenDark, fontWeight: "700" }}>New listing</Text>
                </Pressable>
              )
            : undefined,
        })}
      />
      <Stack.Screen
        name="PropertyCreate"
        component={PropertyCreateScreen}
        options={{ title: "New listing", presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
