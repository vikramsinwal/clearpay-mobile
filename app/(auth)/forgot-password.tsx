import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Placeholder route so Sign In can navigate to forgot-password.
 * Full reset flow lands in a later feature slice.
 */
export default function ForgotPasswordRoute() {
  return (
    <SafeAreaView className="flex-1 bg-[#F3F8FC] px-6">
      <View className="flex-1 items-center justify-center">
        <Text
          className="text-center text-2xl font-bold text-navy"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          Forgot password
        </Text>
        <Text
          className="mt-3 text-center text-base text-navy-300"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          Password reset will be available here.
        </Text>
        <Link href="/sign-in" asChild>
          <Pressable className="mt-8">
            <Text
              className="text-base font-semibold text-blue"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              Back to Sign In
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
