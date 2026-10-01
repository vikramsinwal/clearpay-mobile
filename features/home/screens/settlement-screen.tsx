import { CircleDollarSign } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopHeader } from '@/components/brand/top-header';

export function SettlementScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
      <TopHeader showBack title="Crypto Settlement" />
      <View className="flex-1 items-center justify-center px-7">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <CircleDollarSign color="#1B6CA8" size={30} />
        </View>
        <Text className="mt-5 text-center text-xl text-slate-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
          Settlement is being prepared
        </Text>
        <Text className="mt-2 text-center text-sm leading-6 text-slate-500" style={{ fontFamily: 'PlusJakartaSans_400Regular' }}>
          Your settlement options and available rate will appear here when enabled for your account.
        </Text>
      </View>
    </SafeAreaView>
  );
}
