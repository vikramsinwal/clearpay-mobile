import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Fingerprint,
  Lock,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { FeatureHighlight } from '@/components/FeatureHighlight';
import { GradientButton } from '@/components/ui/gradient-button';
import {
  WELCOME_CTA,
  WELCOME_FEATURES,
  WELCOME_HERO,
  WELCOME_LEGAL,
  WELCOME_TRUST_BADGE,
  WELCOME_TRUST_FOOTER,
} from '@/constants/onboarding-content';

const FEATURE_ICONS = {
  'instant-settlement': Zap,
  'telegram-2fa': Fingerprint,
  'zero-hidden-fees': BadgeCheck,
} as const;

const TRUST_ICONS = [Lock, ShieldCheck, BadgeCheck] as const;

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#F3F8FC]">
      {/* Subtle ambient gradients — kept light; not a full-bleed wash */}
      <LinearGradient
        colors={['rgba(27,108,168,0.12)', 'rgba(13,148,136,0.06)', 'transparent']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          pointerEvents: 'none',
        }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(13,148,136,0.08)', 'rgba(27,108,168,0.05)']}
        end={{ x: 0, y: 1 }}
        start={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          pointerEvents: 'none',
        }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <View
              accessibilityLabel={WELCOME_TRUST_BADGE.text}
              accessibilityRole="text"
              className="mb-6 flex-row items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3.5 py-2"
            >
              <ShieldCheck color="#1B6CA8" size={16} />
              <Text
                className="text-xs font-semibold tracking-wide text-blue uppercase"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {WELCOME_TRUST_BADGE.text}
              </Text>
            </View>

            <View className="mb-6">
              <ClearpayLogo size={96} />
            </View>

            <Text
              accessibilityRole="header"
              className="text-center text-3xl font-bold leading-tight tracking-tight text-navy"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {WELCOME_HERO.titleLine1}
              {'\n'}
              <Text className="text-blue">{WELCOME_HERO.titleLine2}</Text>
            </Text>

            <Text
              className="mt-3 max-w-md text-center text-base leading-6 text-navy-300"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              {WELCOME_HERO.description}
            </Text>
          </View>

          <View className="mt-8 gap-3">
            {WELCOME_FEATURES.map((feature) => {
              const Icon = FEATURE_ICONS[feature.id];
              return (
                <FeatureHighlight
                  key={feature.id}
                  description={feature.description}
                  icon={<Icon color="#1B6CA8" size={22} strokeWidth={2.25} />}
                  title={feature.title}
                />
              );
            })}
          </View>

          <View className="mt-8 gap-3">
            <GradientButton
              accessibilityHint="Opens create account step one"
              accessibilityLabel={WELCOME_CTA.primary}
              label={WELCOME_CTA.primary}
              onPress={() => router.push('/create-account/step-1')}
            />

            <Pressable
              accessibilityHint="Opens the sign in screen"
              accessibilityLabel={`${WELCOME_CTA.secondaryPrefix} ${WELCOME_CTA.secondaryAction}`}
              accessibilityRole="button"
              className="min-h-[48px] items-center justify-center rounded-2xl px-4"
              onPress={() => router.push('/sign-in')}
            >
              {({ pressed }) => (
                <Text
                  className={`text-center text-base ${pressed ? 'text-navy' : 'text-navy-300'}`}
                  style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  {WELCOME_CTA.secondaryPrefix}{' '}
                  <Text
                    className="font-semibold text-blue"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {WELCOME_CTA.secondaryAction}
                  </Text>
                </Text>
              )}
            </Pressable>
          </View>

          <View
            accessibilityLabel={WELCOME_TRUST_FOOTER.map((c) => c.text).join(', ')}
            className="mt-8 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2"
          >
            {WELCOME_TRUST_FOOTER.map((claim, index) => {
              const Icon = TRUST_ICONS[index] ?? Lock;
              return (
                <View key={claim.text} className="flex-row items-center gap-1.5">
                  <Icon color="#5A7BA3" size={14} strokeWidth={2} />
                  <Text
                    className="text-xs font-medium text-navy-300"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {claim.text}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text
            className="mt-4 text-center text-xs leading-5 text-navy-300"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            {WELCOME_LEGAL}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
