import { CheckCircle2 } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { GradientButton } from '@/components/ui/gradient-button';

/**
 * Shown after one-step registration succeeds.
 * Prompts the customer to sign in — no auto-login / no Telegram step.
 */
export function RegisterSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email =
    typeof params.email === 'string' && params.email.trim().length > 0
      ? params.email.trim()
      : null;

  return (
    <SafeAreaView className="flex-1 bg-[#F3F8FC]" edges={['top', 'bottom']}>
      <View className="flex-1 justify-center px-6 pb-8">
        <View className="items-center">
          <ClearpayLogo size={80} />
        </View>

        <View
          className="mt-8 w-full self-center rounded-[20px] bg-white px-5 py-8"
          style={{
            maxWidth: 420,
            shadowColor: '#1B6CA8',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          <View className="items-center">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <CheckCircle2 color="#0D9488" size={36} strokeWidth={2} />
            </View>

            <Text
              accessibilityRole="header"
              className="text-center text-[24px] font-bold tracking-tight text-navy"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Account created
            </Text>

            <Text
              className="mt-3 text-center text-[15px] leading-6 text-navy-300"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              Your Clearpay account has been created successfully. Please sign
              in to continue.
            </Text>

            {email ? (
              <Text
                className="mt-3 text-center text-[13px] text-navy-200"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {email}
              </Text>
            ) : null}
          </View>

          <View className="mt-8">
            <GradientButton
              accessibilityHint="Opens the sign in screen"
              accessibilityLabel="Sign in to your account"
              label="Sign In"
              onPress={() => router.replace('/sign-in')}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
