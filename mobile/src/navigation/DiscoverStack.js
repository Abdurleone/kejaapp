import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DiscoverScreen from "../screens/discover/DiscoverScreen.js";
import PropertyDetailScreen from "../screens/discover/PropertyDetailScreen.js";
import InquiryFormScreen from "../screens/discover/InquiryFormScreen.js";
import ViewingRequestFormScreen from "../screens/discover/ViewingRequestFormScreen.js";
import colors from "../theme/colors.js";

const Stack = createNativeStackNavigator();

export default function DiscoverStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="DiscoverList" component={DiscoverScreen} options={{ title: "Discover" }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: "Property" }} />
      <Stack.Screen
        name="InquiryForm"
        component={InquiryFormScreen}
        options={{ title: "Send inquiry", presentation: "modal" }}
      />
      <Stack.Screen
        name="ViewingRequestForm"
        component={ViewingRequestFormScreen}
        options={{ title: "Request viewing", presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}
