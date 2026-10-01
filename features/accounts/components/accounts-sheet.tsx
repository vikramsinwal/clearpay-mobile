import { X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AccountsSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: React.ReactNode;
};

export function AccountsSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: AccountsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-slate-900/40">
        <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />
        <View
          className="max-h-[90%] rounded-t-2xl bg-white px-4 pt-4 dark:bg-navy-800"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="mb-3 flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text
                className="text-base text-slate-900 dark:text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  className="mt-1 text-xs text-slate-500"
                  style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="rounded-full p-1.5"
              hitSlop={8}
              onPress={onClose}
            >
              <X color="#94A3B8" size={16} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
