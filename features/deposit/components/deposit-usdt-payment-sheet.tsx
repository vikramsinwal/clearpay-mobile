import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DEPOSIT_USDT_COPY,
  type DepositNetwork,
} from '@/constants/deposit';
import {
  confirmDepositFundsSent,
  createDepositSession,
} from '@/features/deposit/api/deposit-api';
import { useDepositCountdown } from '@/features/deposit/hooks/use-deposit-countdown';
import {
  listSelectableDepositNetworks,
  resolveDepositNetworkMeta,
  resolveDepositWalletAddress,
  type DepositPaymentSession,
} from '@/features/deposit/lib/deposit-session';
import { ApiClientError } from '@/lib/api/errors';
import { showAlert } from '@/lib/ui/alert';
import { useDepositFlowStore } from '@/stores/deposit-flow-store';

function isUploadedQrAsset(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  );
}

type DepositUsdtPaymentSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Increment when opening so a fresh countdown/session is created. */
  sessionKey?: number;
  /** Called when the customer indicates funds were sent — continue to proof upload. */
  onFundsSent?: (session: DepositPaymentSession) => void;
};

/**
 * Native Deposit USDT payment-details bottom sheet.
 * Opens after Make Deposit in the Deposit Required popup.
 */
export function DepositUsdtPaymentSheet({
  visible,
  onClose,
  sessionKey = 0,
  onFundsSent,
}: DepositUsdtPaymentSheetProps) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [session, setSession] = useState<DepositPaymentSession | null>(null);
  const [selectedNetwork, setSelectedNetwork] =
    useState<DepositNetwork>('TRC20');
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadingSession(true);
      setSession(null);
      setSessionError(null);
      setCopied(false);
      setConfirming(false);

      try {
        const apiSession = await createDepositSession();
        if (!cancelled) {
          setSession(apiSession);
          const selectable = listSelectableDepositNetworks(apiSession);
          const preferred =
            selectable.find((network) => network === apiSession.network) ??
            selectable[0];
          if (preferred) {
            setSelectedNetwork(preferred);
          }
          // Persist early so proof screen can still resolve the id if
          // Zustand is wiped by a web refresh before "I sent funds".
          if (apiSession.publicId) {
            useDepositFlowStore
              .getState()
              .setSessionPublicId(apiSession.publicId);
          }
        }
      } catch (error) {
        if (!cancelled) {
          // Do NOT silently fall back to a presentation-only session here —
          // it has no server `publicId`, so proof submission can never
          // succeed later and the customer only finds out at the very last
          // step ("Could not submit proof… attach a session id"). Surface
          // the real failure now, with a retry, instead.
          setSessionError(
            error instanceof ApiClientError
              ? error.message
              : DEPOSIT_USDT_COPY.confirmUnavailableBody,
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, sessionKey, retryCount]);

  const onRetrySession = () => setRetryCount((count) => count + 1);

  const countdown = useDepositCountdown(
    session?.expiresAtMs ?? null,
    visible && Boolean(session),
  );

  const selectableNetworks = useMemo(
    () => listSelectableDepositNetworks(session),
    [session],
  );

  const displayAddress = useMemo(
    () => resolveDepositWalletAddress(session, selectedNetwork),
    [session, selectedNetwork],
  );

  const networkMeta = useMemo(
    () => resolveDepositNetworkMeta(session, selectedNetwork),
    [session, selectedNetwork],
  );

  const instructions = useMemo(() => {
    if (!session || !displayAddress) return [] as string[];
    const fromAdmin = networkMeta.instructions
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (fromAdmin.length > 0) {
      return fromAdmin;
    }
    return [
      `Send exactly ${session.amountUsdt} ${session.currency} to the address above`,
      `Use ${selectedNetwork} network only`,
      'Complete within the time limit',
      'Your balance will be updated automatically',
    ];
  }, [session, displayAddress, selectedNetwork, networkMeta.instructions]);

  const onSelectNetwork = (network: DepositNetwork) => {
    if (!selectableNetworks.includes(network)) {
      showAlert(
        DEPOSIT_USDT_COPY.missingAddressTitle,
        network === 'BEP20'
          ? DEPOSIT_USDT_COPY.missingBep20AddressBody
          : DEPOSIT_USDT_COPY.missingAddressBody,
      );
      return;
    }
    setSelectedNetwork(network);
    setCopied(false);
  };

  const onCopyAddress = async () => {
    if (!displayAddress) return;
    try {
      await Clipboard.setStringAsync(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showAlert('Copy failed', 'Unable to copy the wallet address.');
    }
  };

  const onConfirmSent = async () => {
    if (!session || confirming) return;
    if (!session.publicId) {
      // Should not happen now that failed session creation surfaces an
      // error instead of a fake local session, but guard anyway so we
      // never silently advance to a proof step that can't be submitted.
      showAlert(
        DEPOSIT_USDT_COPY.confirmUnavailableTitle,
        DEPOSIT_USDT_COPY.confirmUnavailableBody,
      );
      return;
    }
    if (!displayAddress) {
      showAlert(
        DEPOSIT_USDT_COPY.missingAddressTitle,
        DEPOSIT_USDT_COPY.missingAddressBody,
      );
      return;
    }
    setConfirming(true);
    try {
      const confirmed = await confirmDepositFundsSent({
        publicId: session.publicId,
        network: selectedNetwork,
        walletAddress: displayAddress,
        amountUsdt: session.amountUsdt,
      });
      const publicId =
        confirmed.publicId?.trim() || session.publicId.trim();
      useDepositFlowStore.getState().setSessionPublicId(publicId);
      onClose();
      onFundsSent?.({
        ...session,
        ...confirmed,
        publicId,
        network: selectedNetwork,
        walletAddress: displayAddress,
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : DEPOSIT_USDT_COPY.confirmUnavailableBody;
      showAlert(DEPOSIT_USDT_COPY.confirmUnavailableTitle, message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-slate-950/60">
        <Pressable
          accessibilityLabel="Dismiss overlay"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          className="max-h-[92%] w-full rounded-t-[28px] border-t border-white/60 bg-white"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 16,
            paddingBottom: Math.max(insets.bottom, 8),
          }}
        >
          <View className="items-center pb-1 pt-3">
            <View className="h-1 w-10 rounded-full bg-slate-300" />
          </View>

          <View className="relative flex-row items-start justify-between border-b border-slate-100 px-5 pb-3 pt-1">
            <View className="flex-1 pr-6">
              <Text
                accessibilityRole="header"
                className="text-[17px] font-bold leading-snug tracking-tight text-slate-900"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {DEPOSIT_USDT_COPY.title}
              </Text>
              <Text
                className="mt-0.5 text-[12px] font-medium text-slate-500"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {DEPOSIT_USDT_COPY.subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={DEPOSIT_USDT_COPY.close}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              hitSlop={8}
              onPress={onClose}
            >
              <X color="#64748B" size={16} strokeWidth={2.5} />
            </Pressable>
          </View>

          {loadingSession ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#0052FF" />
            </View>
          ) : sessionError ? (
            <View className="items-center gap-3 px-6 py-14">
              <Text
                className="text-center text-[13px] font-medium text-slate-600"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {sessionError}
              </Text>
              <Pressable
                accessibilityLabel="Retry"
                accessibilityRole="button"
                className="rounded-xl bg-[#0052FF] px-5 py-2.5"
                onPress={onRetrySession}
              >
                <Text
                  className="text-[13px] font-bold text-white"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : !session ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#0052FF" />
            </View>
          ) : (
            <>
              <ScrollView
                className="flex-grow-0"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 14,
                  paddingBottom: 12,
                  gap: 14,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-2">
                  <Clock color="#D97706" size={16} strokeWidth={2} />
                  <Text
                    className="flex-1 text-[12px] font-medium text-slate-700"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {DEPOSIT_USDT_COPY.timeRemaining}
                  </Text>
                  <Text
                    className="text-[12px] font-bold tracking-wider text-amber-700"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {countdown.label}
                  </Text>
                </View>

                <View className="items-center py-0.5">
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {DEPOSIT_USDT_COPY.amountToSend}
                  </Text>
                  <Text
                    className="mt-0.5 text-[24px] font-extrabold tracking-tight text-slate-900"
                    style={{
                      fontFamily: Platform.select({
                        ios: 'Menlo',
                        android: 'monospace',
                        default: 'monospace',
                      }),
                    }}
                  >
                    {session.amountDisplay}
                  </Text>
                  <View className="mt-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5">
                    <Text
                      className="text-[12px] font-bold"
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold',
                        color: '#0052FF',
                      }}
                    >
                      {session.currency}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 rounded-xl border border-blue-200/80 bg-[#EFF6FF] p-2.5">
                  <Info color="#0052FF" size={16} strokeWidth={2} />
                  <Text
                    className="flex-1 text-[11.5px] font-medium leading-4"
                    style={{
                      fontFamily: 'PlusJakartaSans_500Medium',
                      color: '#0052FF',
                    }}
                  >
                    {DEPOSIT_USDT_COPY.networkWarning}
                  </Text>
                </View>

                <View>
                  <Text
                    className="mb-2 text-[13px] font-bold text-slate-800"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {DEPOSIT_USDT_COPY.networkLabel}
                  </Text>
                  {selectableNetworks.length === 0 ? (
                    <Text
                      className="text-[12px] font-medium leading-4 text-slate-500"
                      style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                    >
                      {DEPOSIT_USDT_COPY.noNetworksBody}
                    </Text>
                  ) : (
                    <View className="flex-row gap-2.5">
                      {selectableNetworks.map((network) => {
                        const selected = selectedNetwork === network;
                        return (
                          <Pressable
                            key={network}
                            accessibilityLabel={`Select ${network} network`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                              selected
                                ? 'border-[#0052FF] bg-[#0052FF]'
                                : 'border-slate-200 bg-white'
                            }`}
                            onPress={() => onSelectNetwork(network)}
                            style={({ pressed }) => [
                              { opacity: pressed ? 0.9 : 1 },
                            ]}
                          >
                            <Text
                              className={`text-[14px] font-bold ${
                                selected ? 'text-white' : 'text-slate-500'
                              }`}
                              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                            >
                              {network}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View className="items-center">
                  <View
                    className="items-center justify-center rounded-2xl border-2 border-slate-100 bg-white p-2.5"
                    style={{
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View className="relative">
                      {isUploadedQrAsset(networkMeta.qrCode) ? (
                        <Image
                          accessibilityLabel={`${selectedNetwork} deposit QR`}
                          source={{ uri: networkMeta.qrCode! }}
                          style={{ width: 144, height: 144 }}
                          resizeMode="contain"
                        />
                      ) : displayAddress ? (
                        <QRCode
                          value={displayAddress}
                          size={144}
                          color="#0F172A"
                          backgroundColor="#FFFFFF"
                          ecl="M"
                        />
                      ) : (
                        <View className="h-[144px] w-[144px] items-center justify-center bg-slate-50">
                          <Text
                            className="px-3 text-center text-[11px] text-slate-400"
                            style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                          >
                            Wallet unavailable
                          </Text>
                        </View>
                      )}
                      <View className="absolute inset-0 items-center justify-center">
                        <View className="h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white">
                          <ShieldCheck
                            color="#0052FF"
                            fill="#0052FF"
                            size={18}
                            strokeWidth={0}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text
                    className="mt-1 text-[10px] font-medium text-slate-400"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {networkMeta.qrCaption}
                  </Text>
                </View>

                <View>
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text
                      className="text-[12px] font-semibold text-slate-700"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {networkMeta.addressLabel}
                    </Text>
                    <Text
                      className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {networkMeta.label}
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <Text
                      className="flex-1 px-2 py-2 text-[12px] font-medium text-slate-800"
                      numberOfLines={1}
                      selectable
                      style={{
                        fontFamily: Platform.select({
                          ios: 'Menlo',
                          android: 'monospace',
                          default: 'monospace',
                        }),
                      }}
                    >
                      {displayAddress ?? '—'}
                    </Text>
                    <Pressable
                      accessibilityLabel={DEPOSIT_USDT_COPY.copyAddress}
                      accessibilityRole="button"
                      className="rounded-lg border border-slate-200 bg-white p-2"
                      disabled={!displayAddress}
                      hitSlop={6}
                      onPress={onCopyAddress}
                      style={({ pressed }) => [
                        {
                          opacity: !displayAddress ? 0.4 : pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      {copied ? (
                        <Check color="#059669" size={16} strokeWidth={2.5} />
                      ) : (
                        <Copy color="#64748B" size={16} strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <View className="mb-1.5 flex-row items-center gap-1.5">
                    <Info color="#0052FF" size={14} strokeWidth={2} />
                    <Text
                      className="text-[12px] font-bold"
                      style={{
                        fontFamily: 'PlusJakartaSans_700Bold',
                        color: '#0052FF',
                      }}
                    >
                      {DEPOSIT_USDT_COPY.instructionsTitle}
                    </Text>
                  </View>
                  <View className="gap-1">
                    {instructions.map((item, index) => (
                      <View key={index} className="flex-row items-start gap-1.5">
                        <Text
                          className="text-[11.5px] font-bold text-blue-500"
                          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                        >
                          •
                        </Text>
                        <Text
                          className="flex-1 text-[11.5px] leading-4 text-slate-600"
                          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                        >
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View className="border-t border-slate-100 px-4 pb-1 pt-2.5">
                <View className="flex-row gap-3">
                  <Pressable
                    accessibilityLabel={DEPOSIT_USDT_COPY.cancel}
                    accessibilityRole="button"
                    className="h-11 flex-1 items-center justify-center rounded-xl bg-[#FF4D4F]"
                    disabled={confirming}
                    onPress={onClose}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.92 : 1,
                        shadowColor: '#FB7185',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 2,
                      },
                    ]}
                  >
                    <Text
                      className="text-[12px] font-semibold tracking-wide text-white"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {DEPOSIT_USDT_COPY.cancel}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel={DEPOSIT_USDT_COPY.sentFunds}
                    accessibilityRole="button"
                    className="h-11 flex-1 overflow-hidden rounded-xl"
                    disabled={
                      confirming ||
                      countdown.expired ||
                      !displayAddress ||
                      selectableNetworks.length === 0
                    }
                    onPress={onConfirmSent}
                    style={({ pressed }) => [
                      {
                        opacity:
                          pressed ||
                          confirming ||
                          !displayAddress ||
                          selectableNetworks.length === 0
                            ? 0.92
                            : 1,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#0052FF', '#0070FF']}
                      end={{ x: 1, y: 0.5 }}
                      start={{ x: 0, y: 0.5 }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                      }}
                    >
                      {confirming ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text
                            className="text-[12px] font-semibold tracking-wide text-white"
                            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                          >
                            {DEPOSIT_USDT_COPY.sentFunds}
                          </Text>
                          <ArrowRight color="#FFFFFF" size={14} strokeWidth={2.5} />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                {Platform.OS === 'ios' ? (
                  <View className="mt-2 items-center pb-1">
                    <View className="h-1 w-32 rounded-full bg-slate-300" />
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
