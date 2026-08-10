import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoversScreen from "../screens/movers/MoversScreen.js";
import MoverRequestFormScreen from "../screens/discover/MoverRequestFormScreen.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";
import { displayText } from "../theme/typography.js";

const Stack = createNativeStackNavigator();

export default function MoversStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        // The one "page heading" for every screen this stack owns - same
        // restraint as frontend/styles.css's --font-display (one heading per
        // view, never body/label text).
        headerTitleStyle: { ...displayText, fontSize: 18 },
      }}
    >
      <Stack.Screen
        name="MoversList"
        component={MoversScreen}
        options={{ title: "Movers", headerRight: () => <ColorModeToggle /> }}
      />
      <Stack.Screen
        name="MoverRequestForm"
        component={MoverRequestFormScreen}
        options={{ title: "Request a mover", presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
