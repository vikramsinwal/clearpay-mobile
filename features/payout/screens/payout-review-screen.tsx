import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  AlarmClock,
  Building2,
  CheckCircle2,
  Copy,
  Info,
  LockOpen,
  QrCode,
  ShieldCheck,
  Timer,
  Upload,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/ui/gradient-button';
import {
  PAYOUT_COPY,
  PAYOUT_METHOD_LABEL,
  PAYOUT_REJECTION_LABEL,
  PAYOUT_UPI_APP_LABEL,
} from '@/constants/payout';
import { isPayoutOrderId } from '@/features/payout/api/payout-orders-api';
import { PayoutChrome } from '@/features/payout/components/payout-chrome';
import { PayoutHelpSheet } from '@/features/payout/components/payout-help-sheet';
import { usePayoutFocusStore } from '@/features/payout/stores/payout-focus-store';
import {
  usePayoutCountdown,
  usePayoutOrderQuery,
  usePayoutPaymentIntentMutation,
  usePayoutRealtime,
  usePayoutSupportMutation,
  useSelectPayoutMethodMutation,
  useSubmitPayoutProofMutation,
  useUploadPayoutReceiptMutation,
  useAcceptPayoutMutation,
} from '@/features/payout/hooks/use-payout-orders';
import { payoutErrorMessage } from '@/features/payout/lib/payout-errors';
import { formatFileSize, formatPayoutAmount, initials, referenceIsValid } from '@/features/payout/lib/presentation';
import type { PayoutOrderDetail, PayoutPaymentMethod, PayoutUpiApp } from '@/features/payout/types';
import { showAlert } from '@/lib/ui/alert';

const SUBMITTED_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW', 'PROOF_UPLOADED', 'PROOF_VALIDATING']);

export function PayoutReviewScreen({ orderId }: { orderId: string | null }) {
  const router = useRouter();
  const validId = isPayoutOrderId(orderId) ? orderId : null;
  const orderQuery = usePayoutOrderQuery(validId);
  const order = orderQuery.data;
  usePayoutRealtime(order);
  const countdown = usePayoutCountdown(
    order?.sla.deadlineAt ?? order?.deadlineAt ?? null,
    order?.serverTime ?? null,
    orderQuery.dataUpdatedAt,
    order?.sla.remainingMs ?? null,
  );
  const deadlinePassed = order?.status === 'EXPIRED' || countdown.expired;
  const locked = !order
    ? false
    : !order.payable || (deadlinePassed && !order.sla.allowLateSubmission);
  const expired = deadlinePassed;
  const [helpOpen, setHelpOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [revealedAccount, setRevealedAccount] = useState<string | null>(null);
  const seeded = useRef<string | null>(null);
  const setFocusedOrder = usePayoutFocusStore((state) => state.setOrderId);

  useEffect(() => {
    setFocusedOrder(validId);
    return () => setFocusedOrder(null);
  }, [setFocusedOrder, validId]);

  useEffect(() => {
    if (!order || seeded.current === order.publicId) return;
    seeded.current = order.publicId;
    setReference(order.reference.value ?? '');
    setLocalPreview(null);
  }, [order]);

  const intent = usePayoutPaymentIntentMutation(validId ?? '');
  const method = useSelectPayoutMethodMutation(validId ?? '');
  const upload = useUploadPayoutReceiptMutation(validId ?? '');
  const submit = useSubmitPayoutProofMutation(validId ?? '');
  const support = usePayoutSupportMutation(validId ?? '');
  const accept = useAcceptPayoutMutation(validId ?? '');

  const receiptReady = order?.receipt?.status === 'READY';
  const referenceOk = order ? referenceIsValid(reference, order.reference) : false;
  const canSubmit = Boolean(order && receiptReady && referenceOk && !locked && !submit.isPending);

  async function copy(value: string | null, title: string) {
    if (!value) {
      showAlert(PAYOUT_COPY.copyUnavailable);
      return;
    }
    await Clipboard.setStringAsync(value);
    showAlert(title);
  }

  async function openUpi(app: PayoutUpiApp) {
    if (!order || !validId) return;
    if (locked) {
      showAlert(expired ? PAYOUT_COPY.lateBlocked : PAYOUT_COPY.paymentUnavailable);
      return;
    }
    try {
      const payment = await intent.mutateAsync('UPI');
      if (!payment.uri) {
        showAlert(PAYOUT_COPY.paymentUnavailable);
        return;
      }
      await Linking.openURL(payment.uri);
    } catch (error) {
      const label =
        app === 'GPAY'
          ? PAYOUT_COPY.gpay
          : app === 'PHONEPE'
            ? PAYOUT_COPY.phonepe
            : app === 'PAYTM'
              ? PAYOUT_COPY.paytm
              : 'UPI';
      showAlert(`${PAYOUT_COPY.unableToOpen} ${label}`, payoutErrorMessage(error, PAYOUT_COPY.paymentUnavailable));
    }
  }

  async function chooseMethod(next: PayoutPaymentMethod) {
    if (!order || locked) return;
    try {
      const payment = await method.mutateAsync(next);
      setRevealedAccount(payment.accountNumber);
    } catch (error) {
      showAlert(PAYOUT_COPY.methodFailed, payoutErrorMessage(error, PAYOUT_COPY.methodFailed));
    }
  }

  async function pickReceipt(source: 'library' | 'file') {
    if (!order?.upload || locked) {
      showAlert(order?.upload ? PAYOUT_COPY.lateBlocked : PAYOUT_COPY.uploadLimitMissing);
      return;
    }
    const asset =
      source === 'library' ? await pickImage(order.upload.mimeTypes) : await pickDocument(order.upload.mimeTypes);
    if (!asset) return;
    if (!order.upload.mimeTypes.includes(asset.mimeType) && asset.mimeType !== 'image/jpg') {
      showAlert(PAYOUT_COPY.uploadType);
      return;
    }
    if (asset.sizeBytes > 0 && asset.sizeBytes > order.upload.maxBytes) {
      showAlert(PAYOUT_COPY.uploadTooLarge);
      return;
    }
    setLocalPreview(asset.mimeType.startsWith('image/') ? asset.uri : null);
    setUploadPercent(0);
    try {
      await upload.mutateAsync({
        ...asset,
        maxBytes: order.upload.maxBytes,
        onProgress: setUploadPercent,
      });
      setUploadPercent(null);
    } catch (error) {
      setUploadPercent(null);
      setLocalPreview(null);
      showAlert(PAYOUT_COPY.receiptFailed, payoutErrorMessage(error, PAYOUT_COPY.receiptFailed));
    }
  }

  function chooseFile() {
    if (Platform.OS === 'web') {
      void pickReceipt('file');
      return;
    }
    Alert.alert(PAYOUT_COPY.selectFile, undefined, [
      { text: 'Photo library', onPress: () => void pickReceipt('library') },
      { text: 'PDF or file', onPress: () => void pickReceipt('file') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function onRemove() {
    setLocalPreview(null);
  }

  async function onSubmit() {
    if (!canSubmit || !validId || !order) return;
    try {
      await submit.mutateAsync({
        reference: reference.trim(),
        amountMinor: order.amount,
      });
    } catch (error) {
      showAlert(PAYOUT_COPY.submitFailed, payoutErrorMessage(error, PAYOUT_COPY.submitFailed));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FF]" edges={['top']}>
      <PayoutChrome title={PAYOUT_COPY.reviewTitle} onBack={() => router.back()} />
      {!validId ? (
        <Message text={PAYOUT_COPY.detailFailed} />
      ) : orderQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B6CA8" />
        </View>
      ) : orderQuery.isError || !order ? (
        <Message
          text={payoutErrorMessage(orderQuery.error, PAYOUT_COPY.detailFailed)}
          onRetry={() => void orderQuery.refetch()}
        />
      ) : (
        <ReviewBody
          canSubmit={canSubmit}
          countdownLabel={order.status === 'EXPIRED' || countdown.expired ? PAYOUT_COPY.expired : countdown.label}
          expired={Boolean(expired)}
          helpOpen={helpOpen}
          localPreview={localPreview}
          locked={locked}
          order={order}
          revealedAccount={revealedAccount}
          reference={reference}
          submitting={submit.isPending}
          supportPending={support.isPending}
          uploadPercent={uploadPercent}
          onChooseFile={chooseFile}
          onChooseMethod={(next) => void chooseMethod(next)}
          onClearReference={() => setReference('')}
          onCloseHelp={() => setHelpOpen(false)}
          onCopy={copy}
          onHelp={() => setHelpOpen(true)}
          onOpenUpi={(app) => void openUpi(app)}
          onReference={setReference}
          onRemove={() => void onRemove()}
          onSubmit={() => void onSubmit()}
          onSupport={(input) => {
            support.mutate(input, {
              onSuccess: () => {
                setHelpOpen(false);
                showAlert(PAYOUT_COPY.helpSent);
              },
              onError: (error) => showAlert(PAYOUT_COPY.helpFailed, payoutErrorMessage(error, PAYOUT_COPY.helpFailed)),
            });
          }}
          onUseDetected={(value) => setReference(value)}
          accepting={accept.isPending}
          onAccept={() => {
            accept.mutate(undefined, {
              onError: (error) =>
                showAlert(PAYOUT_COPY.paymentUnavailable, payoutErrorMessage(error, PAYOUT_COPY.paymentUnavailable)),
            });
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ReviewBody(props: {
  order: PayoutOrderDetail;
  countdownLabel: string;
  expired: boolean;
  locked: boolean;
  reference: string;
  uploadPercent: number | null;
  localPreview: string | null;
  canSubmit: boolean;
  submitting: boolean;
  helpOpen: boolean;
  supportPending: boolean;
  onCopy: (value: string | null, title: string) => void;
  onOpenUpi: (app: PayoutUpiApp) => void;
  revealedAccount: string | null;
  onChooseMethod: (method: PayoutPaymentMethod) => void;
  onChooseFile: () => void;
  onRemove: () => void;
  onReference: (value: string) => void;
  onClearReference: () => void;
  onUseDetected: (value: string) => void;
  onSubmit: () => void;
  onHelp: () => void;
  onCloseHelp: () => void;
  onSupport: (input: { reason: import('@/features/payout/types').PayoutHelpReason; description?: string }) => void;
  accepting: boolean;
  onAccept: () => void;
}) {
  const { order } = props;
  const insets = useSafeAreaInsets();
  const beneficiary = order.beneficiary;
  const receipt = order.receipt;
  const showReceipt = Boolean(receipt && receipt.status !== 'NONE' && receipt.fileName) || props.uploadPercent != null;
  const completed = order.status === 'COMPLETED';
  const submitted = SUBMITTED_STATUSES.has(order.status);
  const amount = formatPayoutAmount(order.amount, order.currency);

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-36 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[11px] uppercase tracking-wider text-slate-500">{PAYOUT_COPY.orderId}</Text>
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5"
              onPress={() => props.onCopy(order.displayId, PAYOUT_COPY.orderIdCopied)}
            >
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>#{order.displayId}</Text>
              <Copy color="#1B6CA8" size={14} />
            </Pressable>
          </View>
          <View className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1">
            <Timer color="#1B6CA8" size={14} />
            <Text className="text-[13px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {props.countdownLabel}
            </Text>
            {!props.expired ? <Text className="text-[11px] text-slate-500">{PAYOUT_COPY.left}</Text> : null}
          </View>
        </View>

        {order.action ? (
          <View className="flex-row items-center justify-between rounded-xl bg-blue-50 px-3 py-2">
            <Text className="flex-1 text-[13px] text-blue-900" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              {order.action.label}
            </Text>
            {order.sla.label ? (
              <Text className="rounded-full bg-white px-2 py-0.5 text-[11px] text-blue">{order.sla.label}</Text>
            ) : null}
          </View>
        ) : null}

        {order.canAccept ? (
          <Pressable
            accessibilityRole="button"
            className="h-11 items-center justify-center rounded-xl bg-navy"
            disabled={props.accepting}
            onPress={props.onAccept}
          >
            <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {props.accepting ? 'Accepting…' : 'Accept payout'}
            </Text>
          </Pressable>
        ) : null}

        {completed ? (
          <ResultCard
            amount={amount}
            displayId={order.displayId}
            reference={order.reference.value}
            status={order.statusLabel}
            title={PAYOUT_COPY.payoutCompletedTitle}
          />
        ) : submitted ? (
          <ResultCard
            amount={amount}
            displayId={order.displayId}
            reference={order.reference.value ?? props.reference}
            status={PAYOUT_COPY.submittedStatus}
            title={PAYOUT_COPY.proofSubmittedTitle}
          />
        ) : null}

        {order.rejection && !completed ? (
          <View className="rounded-2xl bg-red-50 p-4">
            <Text className="text-[16px] text-red-800" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {PAYOUT_COPY.submitFailed}
            </Text>
            <Text className="mt-1 text-[14px] text-red-700">
              {order.rejection.code && PAYOUT_REJECTION_LABEL[order.rejection.code]
                ? PAYOUT_REJECTION_LABEL[order.rejection.code]
                : order.rejection.message}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable className="rounded-lg bg-white px-3 py-2" onPress={props.onChooseFile}>
                <Text>{PAYOUT_COPY.replaceReceipt}</Text>
              </Pressable>
              <Pressable className="rounded-lg bg-white px-3 py-2" onPress={props.onClearReference}>
                <Text>{PAYOUT_COPY.editUtr}</Text>
              </Pressable>
              <Pressable className="rounded-lg bg-white px-3 py-2" onPress={props.onHelp}>
                <Text>{PAYOUT_COPY.helpSubmit}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="rounded-2xl bg-white p-4">
          <Text className="text-[11px] uppercase tracking-wider text-slate-500">{PAYOUT_COPY.amountToSend}</Text>
          <View className="mt-1 flex-row items-start justify-between gap-2">
            <Text className="text-[28px] text-blue" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
              {amount}
            </Text>
            {order.adjustment ? (
              <View className="rounded-full bg-teal-50 px-2.5 py-1">
                <Text className="text-[12px] text-teal-800" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {order.adjustment.label}
                </Text>
              </View>
            ) : null}
          </View>
          {order.collateral?.amountLabel ? (
            <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-slate-50 p-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                <LockOpen color="#0D9488" size={18} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{order.collateral.title}</Text>
                  <Text className="text-teal-700" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {order.collateral.amountLabel}
                  </Text>
                </View>
                {order.collateral.message ? (
                  <Text className="text-[11px] text-slate-500">{order.collateral.message}</Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {beneficiary ? (
          <View className="gap-3 rounded-2xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Building2 color="#1B6CA8" size={18} />
                <View>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{PAYOUT_COPY.beneficiaryTitle}</Text>
                  <Text className="text-[11px] text-slate-500">{PAYOUT_COPY.beneficiaryHint}</Text>
                </View>
              </View>
              {beneficiary.paymentMethodLabel ? (
                <Text className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px]">
                  {beneficiary.paymentMethodLabel}
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <View className="flex-row items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{initials(beneficiary.name)}</Text>
                </View>
                <View>
                  <Text className="text-[11px] text-slate-500">{PAYOUT_COPY.customerName}</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{beneficiary.name}</Text>
                </View>
              </View>
              <Text
                className={
                  beneficiary.kycStatus === 'KYC_VERIFIED'
                    ? 'text-[12px] text-teal-700'
                    : beneficiary.kycStatus === 'KYC_FAILED'
                      ? 'text-[12px] text-red-600'
                      : 'text-[12px] text-amber-700'
                }
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {beneficiary.kycLabel}
              </Text>
            </View>

            {beneficiary.upiId ? (
              <View className="gap-2 rounded-xl bg-slate-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1">
                    <QrCode color="#1B6CA8" size={14} />
                    <Text className="text-[11px] uppercase text-slate-500">{PAYOUT_COPY.instantUpi}</Text>
                  </View>
                  <Text className="text-[11px] text-teal-700">{PAYOUT_COPY.fastest}</Text>
                </View>
                <View className="flex-row items-center justify-between rounded-md bg-white px-3 py-2">
                  <Text className="flex-1" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    {beneficiary.upiId}
                  </Text>
                  <Pressable
                    className="rounded-md bg-blue-50 px-2 py-1"
                    onPress={() => props.onCopy(beneficiary.upiId, PAYOUT_COPY.upiCopied)}
                  >
                    <Text className="text-[12px] text-blue">Copy</Text>
                  </Pressable>
                </View>
                <Pressable disabled={props.locked} onPress={() => props.onOpenUpi('DEFAULT')}>
                  <LinearGradient
                    colors={['#008096', '#0070EB', '#0058BC']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text className="text-white" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                      {PAYOUT_COPY.openUpi} {amount}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <View className="flex-row gap-2">
                  {order.upiApps.filter((app) => app !== 'DEFAULT').map((app) => (
                    <Pressable
                      key={app}
                      className="h-8 flex-1 items-center justify-center rounded-md bg-white"
                      disabled={props.locked}
                      onPress={() => props.onOpenUpi(app)}
                    >
                      <Text className="text-[12px]" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                        {PAYOUT_UPI_APP_LABEL[app]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row gap-1">
                  <Info color="#0D9488" size={14} />
                  <Text className="flex-1 text-[11px] text-slate-500">{PAYOUT_COPY.upiHint}</Text>
                </View>
              </View>
            ) : null}

            <View className="gap-2 rounded-xl bg-slate-50 p-3">
              <Text className="text-[11px] uppercase text-slate-500">{PAYOUT_COPY.bankAlternative}</Text>
              <CopyRow
                label={PAYOUT_COPY.accountNumber}
                value={props.revealedAccount ?? beneficiary.accountNumber}
                onCopy={() =>
                  props.onCopy(
                    props.revealedAccount ?? beneficiary.accountNumberCopy ?? unmasked(beneficiary.accountNumber),
                    PAYOUT_COPY.accountCopied,
                  )
                }
              />
              <View className="flex-row gap-2">
                <View className="flex-1 rounded-md bg-white px-3 py-2">
                  <Text className="text-[11px] text-slate-500">{PAYOUT_COPY.ifsc}</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{beneficiary.ifsc ?? '—'}</Text>
                  <Pressable onPress={() => props.onCopy(beneficiary.ifscCopy ?? beneficiary.ifsc, PAYOUT_COPY.ifscCopied)}>
                    <Text className="mt-1 text-[12px] text-blue">{PAYOUT_COPY.copyIfsc}</Text>
                  </Pressable>
                </View>
                <View className="flex-1 rounded-md bg-white px-3 py-2">
                  <Text className="text-[11px] text-slate-500">{PAYOUT_COPY.bankBranch}</Text>
                  <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{beneficiary.bankAndBranch ?? '—'}</Text>
                </View>
              </View>
              <CopyRow
                label={PAYOUT_COPY.mobile}
                value={beneficiary.mobile}
                onCopy={() =>
                  props.onCopy(
                    beneficiary.mobileCopy ?? unmasked(beneficiary.mobile),
                    PAYOUT_COPY.phoneCopied,
                  )
                }
              />
            </View>
          </View>
        ) : null}

        {order.availableMethods.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {order.availableMethods.map((item) => {
              const active = order.selectedMethod === item;
              return (
                <Pressable
                  key={item}
                  className={`rounded-full px-3 py-1.5 ${active ? 'bg-navy' : 'bg-white'}`}
                  disabled={props.locked}
                  onPress={() => props.onChooseMethod(item)}
                >
                  <Text className={active ? 'text-white' : 'text-slate-800'}>{PAYOUT_METHOD_LABEL[item]}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View className="gap-3 rounded-2xl bg-white p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-[18px]" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                {PAYOUT_COPY.uploadTitle}
              </Text>
              <Text className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">{PAYOUT_COPY.required}</Text>
            </View>
            <Text className="text-[11px] text-slate-500">{order.proofStepLabel ?? PAYOUT_COPY.stepFallback}</Text>
          </View>
          {showReceipt ? (
            <View className="rounded-xl bg-slate-50 p-3">
              <View className="flex-row gap-3">
                {props.localPreview || receipt?.previewUrl ? (
                  <Image
                    className="h-20 w-16 rounded-lg bg-slate-200"
                    source={{ uri: props.localPreview ?? receipt?.previewUrl ?? '' }}
                  />
                ) : (
                  <View className="h-20 w-16 items-center justify-center rounded-lg bg-slate-200">
                    <Upload color="#1B6CA8" size={18} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[13px] text-teal-700" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
                    {props.uploadPercent != null
                      ? `${PAYOUT_COPY.uploading} ${props.uploadPercent}%`
                      : receipt?.status === 'READY'
                        ? PAYOUT_COPY.ready
                        : receipt?.status === 'VALIDATING'
                          ? PAYOUT_COPY.validating
                          : receipt?.failureMessage ?? receipt?.status}
                  </Text>
                  <Text numberOfLines={1}>{receipt?.fileName}</Text>
                  <Text className="text-[11px] text-slate-500">{formatFileSize(receipt?.sizeBytes ?? null)}</Text>
                  <View className="mt-2 flex-row gap-2">
                    <Pressable className="rounded bg-slate-200 px-2 py-0.5" onPress={props.onChooseFile}>
                      <Text className="text-[12px]">{PAYOUT_COPY.replace}</Text>
                    </Pressable>
                    <Pressable className="rounded bg-red-50 px-2 py-0.5" onPress={props.onRemove}>
                      <Text className="text-[12px] text-red-700">{PAYOUT_COPY.remove}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
              <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <View
                  className="h-full bg-teal-600"
                  style={{ width: `${props.uploadPercent ?? (receipt?.status === 'READY' ? 100 : 40)}%` }}
                />
              </View>
            </View>
          ) : (
            <Pressable className="items-center rounded-xl bg-slate-50 px-4 py-6" disabled={props.locked} onPress={props.onChooseFile}>
              <Upload color="#1B6CA8" size={24} />
              <Text className="mt-2" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {PAYOUT_COPY.uploadPrompt}
              </Text>
              <Text className="mt-1 text-[11px] text-slate-500">
                {order.upload
                  ? `JPG, PNG, PDF • ${formatFileSize(order.upload.maxBytes)}`
                  : PAYOUT_COPY.uploadLimitMissing}
              </Text>
            </Pressable>
          )}

          <View>
            <View className="mb-1 flex-row items-center justify-between">
              <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{order.reference.label}</Text>
              {order.reference.matchesReceipt ? (
                <Text className="text-[11px] text-teal-700">{PAYOUT_COPY.matchesSlip}</Text>
              ) : null}
            </View>
            <View className="flex-row items-center rounded-xl bg-slate-50 px-3">
              <TextInput
                className="h-12 flex-1 text-[18px] text-slate-900"
                autoCapitalize="characters"
                editable={!props.locked}
                maxLength={order.reference.length && order.reference.length > 0 ? order.reference.length : 32}
                value={props.reference}
                onChangeText={props.onReference}
              />
              {referenceOk(props.reference, order) ? <CheckCircle2 color="#0D9488" size={18} /> : null}
              <Pressable accessibilityLabel="Clear reference" className="ml-2" onPress={props.onClearReference}>
                <X color="#64748B" size={16} />
              </Pressable>
            </View>
            {order.reference.hint ? (
              <Text className="mt-1 text-[11px] text-slate-500">{order.reference.hint}</Text>
            ) : null}
          </View>

          {order.ocr ? (
            <View className="gap-1 rounded-xl bg-slate-50 p-3">
              <OcrRow label={PAYOUT_COPY.detectedUtr} value={order.ocr.utr} onPress={props.onUseDetected} />
              <OcrRow label={PAYOUT_COPY.detectedAmount} value={order.ocr.amountLabel} />
              <OcrRow label={PAYOUT_COPY.detectedStatus} value={order.ocr.transactionStatus} />
              <OcrRow label={PAYOUT_COPY.detectedDate} value={order.ocr.date} />
              <OcrRow label={PAYOUT_COPY.detectedTime} value={order.ocr.time} />
              <OcrRow label={PAYOUT_COPY.detectedBeneficiary} value={order.ocr.beneficiary} />
              <OcrRow label={PAYOUT_COPY.detectedBank} value={order.ocr.bank} />
              <OcrRow label={PAYOUT_COPY.detectedSender} value={order.ocr.sender} />
            </View>
          ) : null}
        </View>

        {order.sla.warningTitle || order.sla.warningDescription ? (
          <View className="flex-row gap-3 rounded-xl bg-cyan-50 p-3.5">
            <AlarmClock color="#006577" size={20} />
            <View className="flex-1">
              {order.sla.warningTitle ? (
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{order.sla.warningTitle}</Text>
              ) : null}
              {order.sla.warningDescription ? (
                <Text className="mt-1 text-[13px] text-slate-700">{order.sla.warningDescription}</Text>
              ) : null}
              {order.sla.penaltyDescription ? (
                <Text className="mt-1 text-[12px] text-slate-600">{order.sla.penaltyDescription}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {order.securityNotice ? (
          <View className="flex-row items-center justify-center gap-2 py-1">
            <ShieldCheck color="#0D9488" size={16} />
            <Text className="text-[11px] text-slate-500">{order.securityNotice}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-slate-200 bg-white px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          accessibilityRole="button"
          className="h-12 flex-row items-center gap-1 rounded-xl bg-slate-100 px-3"
          onPress={props.onHelp}
        >
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{PAYOUT_COPY.needHelp}</Text>
        </Pressable>
        <View className="flex-1">
          <GradientButton
            disabled={!props.canSubmit}
            label={PAYOUT_COPY.submit}
            loading={props.submitting}
            loadingLabel={PAYOUT_COPY.validating}
            onPress={props.onSubmit}
          />
        </View>
      </View>
      <PayoutHelpSheet
        submitting={props.supportPending}
        visible={props.helpOpen}
        onClose={props.onCloseHelp}
        onSubmit={props.onSupport}
      />
    </>
  );
}

function unmasked(value: string | null): string | null {
  if (!value || /[•*]/.test(value)) return null;
  return value;
}

function referenceOk(value: string, order: PayoutOrderDetail): boolean {
  return referenceIsValid(value, order.reference);
}

function ResultCard({
  title,
  displayId,
  amount,
  reference,
  status,
}: {
  title: string;
  displayId: string;
  amount: string;
  reference: string | null;
  status: string;
}) {
  return (
    <View className="rounded-2xl bg-teal-50 p-4">
      <Text className="text-[18px] text-teal-900" style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>
        {title}
      </Text>
      <Text className="mt-2 text-[13px] text-slate-600">
        {PAYOUT_COPY.orderId} #{displayId}
      </Text>
      <Text className="mt-2 text-[13px] text-slate-500">{PAYOUT_COPY.amountLabel}</Text>
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{amount}</Text>
      {reference ? (
        <>
          <Text className="mt-2 text-[13px] text-slate-500">{PAYOUT_COPY.utrLabel}</Text>
          <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{reference}</Text>
        </>
      ) : null}
      <Text className="mt-2 text-[13px] text-slate-500">{PAYOUT_COPY.status}</Text>
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{status}</Text>
    </View>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string | null; onCopy: () => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-md bg-white px-3 py-2">
      <View>
        <Text className="text-[11px] text-slate-500">{label}</Text>
        <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{value ?? '—'}</Text>
      </View>
      <Pressable accessibilityLabel={`Copy ${label}`} onPress={onCopy}>
        <Copy color="#0F172A" size={16} />
      </Pressable>
    </View>
  );
}

function OcrRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | null;
  onPress?: (value: string) => void;
}) {
  if (!value) return null;
  const body = (
    <View className="flex-row items-center justify-between">
      <Text className="text-[12px] text-slate-500">{label}</Text>
      <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{value}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={() => onPress(value)}>
      {body}
    </Pressable>
  );
}

function Message({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-[14px] text-slate-600">{text}</Text>
      {onRetry ? (
        <Pressable className="mt-4" onPress={onRetry}>
          <Text className="text-blue">{PAYOUT_COPY.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

async function pickImage(mimeTypes: string[]) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showAlert('Permission needed', 'Allow photo library access to attach a receipt.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? 'image/jpeg';
  if (!mimeTypes.includes(mimeType) && mimeType !== 'image/jpg') return null;
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? 'receipt.jpg',
    mimeType,
    sizeBytes: asset.fileSize ?? 0,
  };
}

async function pickDocument(mimeTypes: string[]) {
  const result = await DocumentPicker.getDocumentAsync({
    type: mimeTypes,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType ?? 'application/pdf',
    sizeBytes: asset.size ?? 0,
  };
}

export function PayoutReviewRoute() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = typeof params.orderId === 'string' ? params.orderId : null;
  return <PayoutReviewScreen orderId={orderId} />;
}
