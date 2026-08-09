module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Required by react-native-reanimated 4.x (via react-native-worklets) for
    // the liquid tab bar's spring animations - must stay the last plugin.
    plugins: ["react-native-worklets/plugin"],
  };
};
