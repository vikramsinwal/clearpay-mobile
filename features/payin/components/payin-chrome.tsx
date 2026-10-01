import { Text, View } from 'react-native';

import { TopHeader } from '@/components/brand/top-header';
import { PAYIN_COPY } from '@/constants/payin';

export function PayinChrome({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return <TopHeader showBack={Boolean(onBack)} title={title} onBack={onBack} />;
}

export function PayinToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View className="absolute left-0 right-0 top-20 z-50 items-center" pointerEvents="none">
      <View className="rounded-full bg-[#233148] px-4 py-2">
        <Text
          className="text-[12px] text-[#ecf0ff]"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

export { PAYIN_COPY };
