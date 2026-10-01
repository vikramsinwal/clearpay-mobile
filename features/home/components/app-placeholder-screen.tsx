import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHeader } from '@/features/home/components/home-header';
import { useAuthStore } from '@/stores/auth-store';

type PlaceholderScreenProps = {
  title: string;
  body: string;
};

export function AppPlaceholderScreen({ title, body }: PlaceholderScreenProps) {
  const customer = useAuthStore((state) => state.customer);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={['top']}>
      <HomeHeader
        email={customer?.email}
        name={customer?.name}
        title={title}
      />
      <View className="flex-1 items-center justify-center px-6">
        <Text
          className="text-2xl font-bold text-navy"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {title}
        </Text>
        <Text
          className="mt-2 text-center text-base text-navy-300"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {body}
        </Text>
      </View>
    </SafeAreaView>
  );
}
