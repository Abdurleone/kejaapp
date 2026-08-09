import { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { PlatformPressable } from "@react-navigation/elements";
import { useLinkBuilder } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext.js";

// A custom `tabBar` for MainTabs.js's Tab.Navigator: a floating, frosted-glass
// pill (iOS 26 "Liquid Glass" style) instead of the library's default flat
// bar, with an animated indicator that slides and resizes to hug whichever
// tab button is focused. Reads the exact same per-route options
// (tabBarIcon/tabBarLabel/tabBarBadge/tabBarActiveTintColor/etc.) the default
// bar would, so MainTabs.js's screenOptions - including the Dashboard
// signed-out dark-header special case - keep working unchanged.
//
// Deliberately stays in the normal layout flow (not position: absolute) so
// screen content's existing bottom padding/scroll insets don't need to
// change anywhere else - the "floating" look comes from the pill's own
// margin and rounded corners within the space it already reserves, not from
// overlapping content below it.
export default function LiquidTabBar({ state, descriptors, navigation }) {
  const { colors, resolvedColorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { buildHref } = useLinkBuilder();

  const layoutsRef = useRef([]);
  const hasMeasuredActiveRef = useRef(false);
  const [, forceRemeasure] = useState(0);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const moveIndicatorTo = useCallback(
    (index) => {
      const layout = layoutsRef.current[index];
      if (!layout) return;

      if (!hasMeasuredActiveRef.current) {
        // First measurement: snap straight into place (duration: 0) instead
        // of springing in from the top-left corner on mount.
        // react-hooks/immutability doesn't recognize Reanimated's shared
        // values as mutable-by-design - assigning .value is the documented,
        // correct API (https://docs.swmansion.com/react-native-reanimated).
        // eslint-disable-next-line react-hooks/immutability
        indicatorX.value = withTiming(layout.x, { duration: 0 });
        // eslint-disable-next-line react-hooks/immutability
        indicatorWidth.value = withTiming(layout.width, { duration: 0 });
        hasMeasuredActiveRef.current = true;
      } else {
        indicatorX.value = withSpring(layout.x, { damping: 18, stiffness: 180 });
        indicatorWidth.value = withSpring(layout.width, { damping: 18, stiffness: 180 });
      }
    },
    [indicatorX, indicatorWidth]
  );

  const handleTabLayout = useCallback(
    (index, event) => {
      const { x, width } = event.nativeEvent.layout;
      layoutsRef.current[index] = { x, width };
      if (index === state.index) moveIndicatorTo(index);
      // Layouts for other tabs may still be pending on first mount - force a
      // re-render so a late-measured focused tab's onLayout above still runs.
      forceRemeasure((n) => n + 1);
    },
    [state.index, moveIndicatorTo]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const activeTint = focusedOptions.tabBarActiveTintColor || colors.accentText;
  const inactiveTint = focusedOptions.tabBarInactiveTintColor || colors.muted;
  // MainTabs.js's Dashboard signed-out case passes a tabBarStyle with just a
  // backgroundColor override (meant for the old solid bar) - reused here as
  // the glass pill's tint instead of replacing the blur outright, so it
  // still reads as "this bar belongs to a dark hero" without losing the
  // frosted-glass material everywhere else.
  const tintOverlayColor = focusedOptions.tabBarStyle?.backgroundColor || `${colors.surface}b3`;

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: insets.bottom + 10 },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { borderColor: colors.line }]}>
        <BlurView
          intensity={70}
          tint={resolvedColorMode === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tintOverlayColor }]} />
        <Animated.View
          style={[styles.indicator, indicatorStyle, { backgroundColor: `${activeTint}26` }]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const tintColor = isFocused ? activeTint : inactiveTint;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            } else if (isFocused) {
              moveIndicatorTo(index);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <PlatformPressable
              key={route.key}
              href={buildHref(route.name, route.params)}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={(event) => handleTabLayout(index, event)}
              style={styles.tab}
            >
              {options.tabBarIcon?.({ focused: isFocused, color: tintColor, size: 24 })}
              <Text style={[styles.label, { color: tintColor }]}>{label}</Text>
              {options.tabBarBadge != null && (
                <View style={[styles.badge, { backgroundColor: colors.red }]}>
                  <Text style={styles.badgeText}>{options.tabBarBadge}</Text>
                </View>
              )}
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  indicator: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 26,
  },
  tab: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
});
