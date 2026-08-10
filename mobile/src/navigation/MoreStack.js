import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MoreScreen from "../screens/more/MoreScreen.js";
import { screens } from "./tabScreens.js";
import { useTheme } from "../context/ThemeContext.js";
import ColorModeToggle from "../components/ColorModeToggle.js";
import { displayText } from "../theme/typography.js";

const Stack = createNativeStackNavigator();

// Everything MainTabs doesn't pin to the bar (Notifications, Feedback,
// Account, and whichever role-specific extras aren't that role's one
// signature feature) lives here as ordinary pushed screens, reusing the
// exact same components/options tabScreens.js already defines for them -
// nothing about those screens themselves changes, only how you get to them.
export default function MoreStack({ hiddenTabs, unreadCount, onOpenNotifications }) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { ...displayText, fontSize: 18 },
      }}
    >
      <Stack.Screen name="MoreMenu" options={{ title: "More", headerRight: () => <ColorModeToggle /> }}>
        {({ navigation }) => (
          <MoreScreen
            navigation={navigation}
            hiddenTabs={hiddenTabs}
            unreadCount={unreadCount}
            onOpenNotifications={onOpenNotifications}
          />
        )}
      </Stack.Screen>
      {hiddenTabs.map((name) => (
        <Stack.Screen
          key={name}
          name={name}
          component={screens[name].component}
          options={{ headerRight: () => <ColorModeToggle />, ...screens[name].options }}
        />
      ))}
    </Stack.Navigator>
  );
}
