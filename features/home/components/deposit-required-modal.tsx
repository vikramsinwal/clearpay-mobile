import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CircleDollarSign, ShieldCheck, X } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import {
  DEPOSIT_REQUIRED_COPY,
  formatMinDepositUsdt,
} from '@/constants/home';

type DepositRequiredModalProps = {
  visible: boolean;
  onClose: () => void;
  onMakeDeposit: () => void;
};

/**
 * Native Deposit Required dialog — matches Clearpay trader modal reference.
 * No HTML / WebView.
 */
export function DepositRequiredModal({
  visible,
  onClose,
  onMakeDeposit,
}: DepositRequiredModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-slate-950/60 px-4">
        <Pressable
          accessibilityLabel="Dismiss overlay"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          className="w-full max-w-[360px] rounded-3xl border border-white/80 bg-white px-6 pb-6 pt-5"
          style={{
            shadowColor: '#0B1F3A',
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.2,
            shadowRadius: 28,
            elevation: 12,
          }}
        >
          <Pressable
            accessibilityLabel="Close dialog"
            accessibilityRole="button"
            className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-slate-100"
            hitSlop={8}
            onPress={onClose}
          >
            <X color="#64748B" size={16} strokeWidth={2.5} />
          </Pressable>

          <View className="mt-1 items-center">
            <View className="mb-3 items-center">
              <ClearpayLogo size={52} />
            </View>

            <Text
              accessibilityRole="header"
              className="text-center text-[20px] font-bold tracking-tight text-slate-900"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {DEPOSIT_REQUIRED_COPY.title}
            </Text>
            <Text
              className="mt-1 text-center text-[12px] font-medium text-slate-400"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {DEPOSIT_REQUIRED_COPY.subtitle}
            </Text>
          </View>

          <View className="mt-4 items-center gap-3.5">
            <Text
              className="px-2 text-center text-[12px] font-medium leading-5 text-slate-600"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {DEPOSIT_REQUIRED_COPY.body}
            </Text>

            <View className="w-full flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
              <View className="h-8 w-8 items-center justify-center rounded-xl border border-teal-200 bg-teal-50">
                <CircleDollarSign color="#0D9488" size={16} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[10px] font-bold uppercase tracking-wide text-slate-400"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {DEPOSIT_REQUIRED_COPY.requiredAmountLabel}
                </Text>
                <View className="mt-0.5 flex-row flex-wrap items-baseline gap-1">
                  <Text
                    className="text-[14px] font-extrabold text-slate-900"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {formatMinDepositUsdt()}
                  </Text>
                  <Text
                    className="text-[10px] font-semibold text-teal-600"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {DEPOSIT_REQUIRED_COPY.networks}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-center gap-1.5 pt-0.5">
              <ShieldCheck color="#10B981" size={14} />
              <Text
                className="flex-shrink text-[11px] text-slate-400"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {DEPOSIT_REQUIRED_COPY.trustNote}
              </Text>
            </View>
          </View>

          <View className="mt-6 gap-2.5">
            <Pressable
              accessibilityLabel={DEPOSIT_REQUIRED_COPY.cta}
              accessibilityRole="button"
              className="overflow-hidden rounded-xl"
              onPress={onMakeDeposit}
              style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
            >
              <LinearGradient
                colors={['#0052FF', '#00D4B2']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: '#0052FF',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 6,
                }}
              >
                <Text
                  className="text-[14px] font-bold text-white"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {DEPOSIT_REQUIRED_COPY.cta}
                </Text>
                <ArrowRight color="#FFFFFF" size={16} strokeWidth={2.5} />
              </LinearGradient>
            </Pressable>

            <Pressable
              accessibilityLabel={DEPOSIT_REQUIRED_COPY.dismiss}
              accessibilityRole="button"
              className="items-center py-2.5"
              hitSlop={8}
              onPress={onClose}
            >
              <Text
                className="text-center text-[12px] font-semibold text-slate-500"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_REQUIRED_COPY.dismiss}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
