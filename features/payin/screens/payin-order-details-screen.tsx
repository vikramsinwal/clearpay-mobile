import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import {
  BadgeCheck,
  Check,
  TriangleAlert,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopHeader } from '@/components/brand/top-header';
import { OutlineButton } from '@/components/ui/outline-button';
import { PAYIN_COPY, VERIFICATION_LABEL } from '@/constants/payin';
import { DisputeSheet, SmsConsentSheet } from '@/features/payin/components/dispute-sheet';
import { PayinOrderDetailBody } from '@/features/payin/components/payin-order-detail-body';
import { ReceiptViewer } from '@/features/payin/components/receipt-viewer';
import { ReleaseConfirmModal } from '@/features/payin/components/release-confirm-modal';
import { isPayinOrderId } from '@/features/payin/api/payin-orders-api';
import {
  payinShouldPoll,
  usePayinOrder,
  usePayinRealtime,
  usePayinReleaseStatus,
  usePayinSlip,
  usePayinVerification,
  useReleasePayin,
  useServerCountdown,
  useSmsEvidenceBridge,
  useSubmitDispute,
} from '@/features/payin/hooks/use-payin-orders';
import { payinErrorMessage } from '@/features/payin/lib/errors';
import { formatMoneyMinor, isHttpsUrl } from '@/features/payin/lib/format';
import { SmsPaymentVerificationService } from '@/features/payin/sms/sms-payment-verification';
import { useSmsConsentStore } from '@/features/payin/stores/sms-consent-store';
import type { PayinOrderDetail } from '@/features/payin/types';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/lib/ui/alert';

type PayinOrderDetailsScreenProps = {
  orderId: string | null;
};

export function PayinOrderDetailsScreen({ orderId }: PayinOrderDetailsScreenProps) {
  const validId = isPayinOrderId(orderId) ? orderId : null;
  const orderQuery = usePayinOrder(validId);
  const order = orderQuery.data;
  const live = Boolean(order) && payinShouldPoll(order?.status);
  const verificationQuery = usePayinVerification(validId, live);
  const countdown = useServerCountdown(
    order?.expiresAt ?? null,
    order?.serverTime ?? null,
    orderQuery.dataUpdatedAt,
  );
  const locallyExpired = Boolean(order) && (order?.status === 'EXPIRED' || countdown.expired) && order?.status !== 'COMPLETED';
  useSmsEvidenceBridge(validId, Boolean(order) && live && !locallyExpired);
  usePayinRealtime(order);

  const release = useReleasePayin(validId ?? '');
  const dispute = useSubmitDispute(validId ?? '');
  const slip = usePayinSlip(validId ?? '');
  const releaseStatus = usePayinReleaseStatus(
    validId,
    order?.status === 'RELEASING' || order?.status === 'RELEASE_PENDING' || release.isSuccess,
  );
  const timezone = useAuthStore((state) => state.customer?.profile?.timezone);
  const smsChoice = useSmsConsentStore((state) => state.choice);
  const enableSms = useSmsConsentStore((state) => state.enable);
  const declineSms = useSmsConsentStore((state) => state.decline);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [slipPhase, setSlipPhase] = useState<'idle' | 'preparing' | 'ready'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const insets = useSafeAreaInsets();

  const verified = verificationQuery.data?.verifiedCount ?? order?.verifiedCount ?? 0;
  const totalChecks = verificationQuery.data?.totalChecks ?? order?.totalChecks ?? 0;
  const releasing =
    release.isPending || order?.status === 'RELEASING' || order?.status === 'RELEASE_PENDING';
  const completed = order?.status === 'COMPLETED';
  const canRelease = Boolean(
    order &&
      order.releaseEligibility.canRelease &&
      !locallyExpired &&
      !order.disputeOpen &&
      order.status !== 'DISPUTED' &&
      order.status !== 'FAILED' &&
      order.status !== 'CANCELLED' &&
      !completed &&
      !releasing,
  );
  const blockReason = releaseBlockReason(order, locallyExpired);
  const viewOrder = order
    ? {
        ...order,
        verificationChecks: verificationQuery.data?.checks ?? order.verificationChecks,
        verificationStatus: verificationQuery.data?.overallStatus ?? order.verificationStatus,
        verifiedCount: verificationQuery.data?.verifiedCount ?? order.verifiedCount,
        totalChecks: verificationQuery.data?.totalChecks ?? order.totalChecks,
        transactionId: releaseStatus.data?.transactionId ?? order.transactionId,
      }
    : null;

  async function copy(value: string, title: string) {
    await Clipboard.setStringAsync(value);
    setToast(title);
  }

  async function onDownload() {
    if (!validId) return;
    setSlipPhase('preparing');
    setToast(PAYIN_COPY.preparingSlip);
    try {
      const result = await slip.mutateAsync();
      setSlipPhase('ready');
      setToast(PAYIN_COPY.downloadReady);
      await Linking.openURL(result.downloadUrl);
    } catch (error) {
      setSlipPhase('idle');
      showAlert(PAYIN_COPY.downloadSlip, payinErrorMessage(error, PAYIN_COPY.slipFailed));
    }
  }

  function onContactSupport() {
    const support = process.env.EXPO_PUBLIC_SUPPORT_URL?.trim();
    if (support && (support.startsWith('mailto:') || isHttpsUrl(support))) {
      void Linking.openURL(support);
      return;
    }
    showAlert(PAYIN_COPY.contactSupport, PAYIN_COPY.supportMissing);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9ff]" edges={['top']}>
      {toast ? (
        <View className="absolute left-0 right-0 top-20 z-50 items-center" pointerEvents="none">
          <View className="flex-row items-center gap-2 rounded-full bg-[#233148] px-4 py-2">
            <Check color="#57fdc8" size={16} />
            <Text
              className="text-[12px] text-[#ecf0ff]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {toast}
            </Text>
          </View>
        </View>
      ) : null}
      <TopHeader title={PAYIN_COPY.detailsTitle} onBack={() => router.back()} />

      {!validId ? (
        <Centered message={PAYIN_COPY.detailFailed} />
      ) : orderQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B6CA8" />
        </View>
      ) : orderQuery.isError || !order ? (
        <Centered message={PAYIN_COPY.detailFailed} onRetry={() => void orderQuery.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerClassName="pb-8 pt-3"
            refreshControl={
              <RefreshControl
                refreshing={orderQuery.isRefetching}
                onRefresh={() => {
                  void orderQuery.refetch();
                }}
              />
            }
          >
            {completed ? (
              <SuccessPanel
                amount={formatMoneyMinor(order.expectedInboundAmountMinor, order.currency)}
                transactionId={viewOrder?.transactionId ?? order.transactionId}
                onDownload={() => void onDownload()}
                onViewCustomer={() =>
                  showAlert(PAYIN_COPY.customer, order.remitterName)
                }
                onViewTransaction={() => {
                  if (order.transactionId) {
                    void copy(order.transactionId, PAYIN_COPY.transactionCopied);
                  }
                }}
              />
            ) : null}

            {locallyExpired && !completed ? (
              <View className="mx-4 mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Text
                  className="text-[16px] text-amber-900"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {PAYIN_COPY.orderExpiredTitle}
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-amber-800">
                  {PAYIN_COPY.orderExpiredBody}
                </Text>
              </View>
            ) : null}

            {order.status === 'DISPUTED' || order.disputeOpen ? (
              <Banner text={PAYIN_COPY.disputedBanner} tone="danger" />
            ) : null}
            {order.status === 'FAILED' ? <Banner text={PAYIN_COPY.failedBanner} tone="danger" /> : null}
            {viewOrder && (viewOrder.status === 'PENDING_VERIFICATION' || viewOrder.verificationStatus === 'PENDING' || viewOrder.verificationStatus === 'PARTIALLY_VERIFIED') ? (
              <Banner text={VERIFICATION_LABEL[viewOrder.verificationStatus]} tone="info" />
            ) : null}

            <PayinOrderDetailBody
              canZoom={Boolean(viewOrder?.receipt?.fullImageUrl || viewOrder?.receipt?.previewUrl)}
              countdownLabel={countdown.label}
              expired={locallyExpired}
              expiringSoon={countdown.phase === 'EXPIRING_SOON'}
              order={viewOrder ?? order}
              slipBusy={slipPhase === 'preparing'}
              smsChoice={smsChoice}
              timeZone={timezone}
              totalChecks={totalChecks}
              verified={verified}
              onCall={() => {
                const dial = (order.remitterPhone ?? '').replace(/[^\d+]/g, '');
                if (dial) void Linking.openURL(`tel:${dial}`);
              }}
              onCopyOrderId={() => void copy(order.displayId, PAYIN_COPY.orderIdCopied)}
              onCopyUtr={() => {
                if (order.utr) void copy(order.utr, PAYIN_COPY.utrCopied);
              }}
              onDownload={() => void onDownload()}
              onEnableSms={() => setSmsOpen(true)}
              onZoom={() => setZoomOpen(true)}
            />
          </ScrollView>

          {completed ? null : (
            <View
              className="bg-[#f9f9ff]/95 px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="h-12 w-1/3 flex-row items-center justify-center gap-1 rounded-lg bg-[#d6e3ff]"
                  disabled={order.status === 'DISPUTED' || order.disputeOpen}
                  onPress={() => setDisputeOpen(true)}
                >
                  <TriangleAlert color="#ba1a1a" size={18} />
                  <Text
                    className="text-[14px] text-[#ba1a1a]"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {PAYIN_COPY.dispute}
                  </Text>
                </Pressable>
                {locallyExpired ? (
                  <Pressable
                    accessibilityRole="button"
                    className="h-12 flex-1 items-center justify-center rounded-lg bg-[#e8eeff]"
                    onPress={onContactSupport}
                  >
                    <Text
                      className="text-[14px] text-[#0d1c32]"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {PAYIN_COPY.contactSupport}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    className="h-12 flex-1 overflow-hidden rounded-lg"
                    disabled={!canRelease}
                    onPress={() => setConfirmOpen(true)}
                  >
                    <LinearGradient
                      colors={canRelease ? ['#008096', '#0070eb', '#0058bc'] : ['#c1c6d6', '#c1c6d6']}
                      end={{ x: 1, y: 0.5 }}
                      start={{ x: 0, y: 0.5 }}
                      style={{
                        height: 48,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 8,
                      }}
                    >
                      <BadgeCheck color="#ffffff" size={20} />
                      <Text
                        className="text-[14px] text-white"
                        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                      >
                        {releasing ? PAYIN_COPY.releasing : PAYIN_COPY.confirmRelease}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
              <Text className="mt-2 text-center text-[11px] text-[#414754]">
                {blockReason ?? PAYIN_COPY.confirmBody}
              </Text>
            </View>
          )}

          <ReleaseConfirmModal
            amount={formatMoneyMinor(order.expectedInboundAmountMinor, order.currency)}
            collateral={
              order.collateral
                ? `${formatMoneyMinor(order.collateral.amountMinor, order.collateral.currency)} · ${order.collateral.status}`
                : '—'
            }
            customer={order.remitterName}
            submitting={release.isPending}
            utr={order.utr ?? PAYIN_COPY.awaitingUtr}
            verification={`${verified} of ${totalChecks} checks passed`}
            visible={confirmOpen}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              void release.mutateAsync().then(
                (result) => {
                  setConfirmOpen(false);
                  if (result?.status === 'COMPLETED') {
                    router.replace(
                      `/payin-result?orderId=${encodeURIComponent(result.publicId)}&kind=success` as Href,
                    );
                  }
                },
                (error: unknown) => {
                  setConfirmOpen(false);
                  showAlert(
                    PAYIN_COPY.confirmRelease,
                    payinErrorMessage(error, PAYIN_COPY.releaseFailed),
                  );
                },
              );
            }}
          />
          <DisputeSheet
            submitting={dispute.isPending}
            visible={disputeOpen}
            onClose={() => setDisputeOpen(false)}
            onSubmit={(input) => {
              void dispute.mutateAsync(input).then(
                () => setDisputeOpen(false),
                (error: unknown) =>
                  showAlert(PAYIN_COPY.dispute, payinErrorMessage(error, PAYIN_COPY.disputeFailed)),
              );
            }}
          />
          <ReceiptViewer
            key={zoomOpen ? 'open' : 'closed'}
            imageUrl={zoomOpen ? order.receipt?.fullImageUrl ?? order.receipt?.previewUrl ?? null : null}
            visible={zoomOpen}
            onClose={() => setZoomOpen(false)}
          />
        </>
      )}

      <SmsConsentSheet
        visible={smsOpen}
        onDecline={() => {
          declineSms();
          setSmsOpen(false);
        }}
        onEnable={() => {
          enableSms();
          setSmsOpen(false);
          void SmsPaymentVerificationService.startListening({ consented: true }).then((status) => {
            if (status.mode === 'manual_fallback') {
              showAlert(PAYIN_COPY.smsListening, PAYIN_COPY.smsManual);
            }
          });
        }}
      />
    </SafeAreaView>
  );
}

function releaseBlockReason(order: PayinOrderDetail | undefined, locallyExpired: boolean): string | null {
  if (!order || order.status === 'COMPLETED') return null;
  if (locallyExpired) return PAYIN_COPY.orderExpiredBody;
  if (order.releaseEligibility.canRelease) return null;
  return order.releaseEligibility.reasons[0] ?? PAYIN_COPY.releaseUnavailable;
}

function SuccessPanel({
  amount,
  transactionId,
  onViewTransaction,
  onViewCustomer,
  onDownload,
}: {
  amount: string;
  transactionId: string | null;
  onViewTransaction: () => void;
  onViewCustomer: () => void;
  onDownload: () => void;
}) {
  return (
    <View className="mx-4 mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
      <Text
        className="text-[18px] text-emerald-900"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {PAYIN_COPY.paymentReleased}
      </Text>
      <Text
        className="mt-1 text-[28px] text-emerald-950"
        style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
      >
        {amount}
      </Text>
      <Text className="mt-1 text-[13px] text-emerald-800">{PAYIN_COPY.customerCredited}</Text>
      <Text className="text-[13px] text-emerald-800">{PAYIN_COPY.collateralReleased}</Text>
      <Text className="mt-2 text-[13px] text-emerald-900">
        {PAYIN_COPY.transactionId}: {transactionId ?? '—'}
      </Text>
      <View className="mt-3 gap-2">
        <OutlineButton label={PAYIN_COPY.viewTransaction} onPress={onViewTransaction} />
        <OutlineButton label={PAYIN_COPY.viewCustomer} onPress={onViewCustomer} />
        <OutlineButton label={PAYIN_COPY.downloadReceipt} onPress={onDownload} />
      </View>
    </View>
  );
}

function Banner({ text, tone }: { text: string; tone: 'danger' | 'info' }) {
  const danger = tone === 'danger';
  return (
    <View className={`mx-4 mb-3 rounded-2xl px-4 py-3 ${danger ? 'bg-rose-50' : 'bg-blue-50'}`}>
      <Text className={`text-[13px] ${danger ? 'text-rose-800' : 'text-blue-800'}`}>{text}</Text>
    </View>
  );
}

function Centered({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-[14px] text-slate-600">{message}</Text>
      {onRetry ? (
        <Pressable className="mt-4" onPress={onRetry}>
          <Text className="text-[15px] text-blue-600">{PAYIN_COPY.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
