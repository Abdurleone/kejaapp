import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import WorkspaceScreen from "../screens/workspace/WorkspaceScreen.js";
import PropertyCreateScreen from "../screens/workspace/PropertyCreateScreen.js";
import PropertyEditScreen from "../screens/workspace/PropertyEditScreen.js";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";

const Stack = createNativeStackNavigator();
const listingManagerRoles = ["landlord", "agency"];

export default function WorkspaceStack() {
  const { user, signedIn } = useAuth();
  const { colors } = useTheme();
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
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {canManageListings ? (
                <Pressable onPress={() => navigation.navigate("PropertyCreate")} hitSlop={10}>
                  <Text style={{ color: colors.greenDark, fontWeight: "700" }}>New listing</Text>
                </Pressable>
              ) : null}
              <ColorModeToggle />
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="PropertyCreate"
        component={PropertyCreateScreen}
        options={{ title: "New listing", presentation: "modal" }}
      />
      <Stack.Screen name="PropertyEdit" component={PropertyEditScreen} options={{ title: "Edit listing" }} />
    </Stack.Navigator>
  );
}
