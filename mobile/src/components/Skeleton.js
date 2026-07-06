import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import colors from "../theme/colors.js";

export default function Skeleton({ style }) {
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ backgroundColor: colors.surfaceSoft, borderRadius: 6, opacity }, style]}
    />
  );
}
