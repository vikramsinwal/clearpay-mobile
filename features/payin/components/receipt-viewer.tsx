import { X } from 'lucide-react-native';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAYIN_COPY } from '@/constants/payin';

type ReceiptViewerProps = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export function ReceiptViewer({ visible, imageUrl, onClose }: ReceiptViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(4, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
        return;
      }
      scale.value = withTiming(2);
      savedScale.value = 2;
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  return (
    <Modal animationType="fade" visible={visible} onRequestClose={onClose}>
      <GestureHandlerRootView className="flex-1 bg-slate-950">
        <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text
              className="text-white"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {PAYIN_COPY.zoomImage}
            </Text>
            <Pressable
              accessibilityLabel={PAYIN_COPY.closeViewer}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center"
              onPress={onClose}
            >
              <X color="#FFFFFF" size={22} />
            </Pressable>
          </View>
          {imageUrl ? (
            <GestureDetector gesture={gesture}>
              <Animated.Image
                accessibilityLabel={PAYIN_COPY.customerReceipt}
                resizeMode="contain"
                source={{ uri: imageUrl }}
                style={[{ width, height: height - insets.top - insets.bottom - 56 }, style]}
              />
            </GestureDetector>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
