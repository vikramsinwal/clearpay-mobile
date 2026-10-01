import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Copy,
  Info,
  ShieldCheck,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClearpayAppHeader } from '@/components/brand/clearpay-app-header';
import {
  DEPOSIT_PROOF_COPY,
  DEPOSIT_PROOF_TRUST_STAMP,
  formatDepositProofNoticeAmount,
  getDepositProofOverview,
} from '@/constants/deposit-proof';
import {
  fetchDepositStatus,
  submitDepositProof,
} from '@/features/deposit/api/deposit-api';
import { readDepositSessionPublicId } from '@/features/deposit/lib/persist-session-id';
import {
  depositProofSchema,
  type DepositProofReceipt,
  type DepositProofValues,
} from '@/features/deposit/schema/deposit-proof';
import { useDepositFlowStore } from '@/stores/deposit-flow-store';
import { ApiClientError } from '@/lib/api/errors';
import { showAlert } from '@/lib/ui/alert';

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim());
    return first?.trim() ?? null;
  }
  return null;
}

/** OPEN / FUNDS_CLAIMED sessions can still accept a proof upload. */
function isProofEligibleStatus(status: string): boolean {
  return status === 'OPEN' || status === 'FUNDS_CLAIMED';
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return 'Ready';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function applyReceipt(
  setValue: (
    name: 'receipt',
    value: DepositProofReceipt,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean },
  ) => void,
  next: DepositProofReceipt,
) {
  if (next.size > DEPOSIT_PROOF_COPY.maxFileBytes) {
    showAlert('File too large', 'Please choose a PNG, JPG, or PDF up to 10MB.');
    return;
  }
  setValue('receipt', next, { shouldValidate: true, shouldDirty: true });
}

/**
 * Deposit Flow Step 2 — submit TXID + receipt screenshot/PDF after transfer.
 * POSTs receiptBase64 to /deposits/sessions/:id/proof (PROOF_SUBMITTED).
 */
export function SubmitDepositProofScreen() {
  const router = useRouter();
  const localParams = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const globalParams = useGlobalSearchParams<{
    sessionId?: string | string[];
  }>();
  const queryClient = useQueryClient();
  const markUnderReview = useDepositFlowStore((state) => state.markUnderReview);
  const setSessionPublicId = useDepositFlowStore(
    (state) => state.setSessionPublicId,
  );
  const [copyLabel, setCopyLabel] = useState(DEPOSIT_PROOF_COPY.copy as string);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [overview, setOverview] = useState(() => getDepositProofOverview());

  const routeSessionId =
    firstParam(localParams.sessionId) ?? firstParam(globalParams.sessionId);

  const session = overview;
  const notice = useMemo(
    () => formatDepositProofNoticeAmount(session.amountDisplay, session.currency),
    [session.amountDisplay, session.currency],
  );

  /**
   * Resolve the deposit session public id for proof submit.
   * Order: route query → Zustand → persisted storage → GET /deposit/status
   * (OPEN / FUNDS_CLAIMED active session).
   */
  const resolveSessionPublicId = async (): Promise<string | null> => {
    if (routeSessionId) {
      setSessionPublicId(routeSessionId);
      return routeSessionId;
    }

    const fromStore =
      useDepositFlowStore.getState().sessionPublicId?.trim() || null;
    if (fromStore) {
      return fromStore;
    }

    const fromPersist = await readDepositSessionPublicId();
    if (fromPersist) {
      setSessionPublicId(fromPersist);
      return fromPersist;
    }

    try {
      const payload = await fetchDepositStatus();
      const active = payload.status.activeSession;
      if (active?.publicId && isProofEligibleStatus(active.status)) {
        setSessionPublicId(active.publicId);
        setOverview(
          getDepositProofOverview({
            recipientAddress: active.walletAddress,
            networkLabel: active.networkLabel || active.network,
            amountUsdt: active.amountUsdt,
            amountDisplay: active.amountDisplay,
          }),
        );
        return active.publicId;
      }
    } catch {
      // Fall through to the missing-session alert below.
    }

    return null;
  };

  // Hydrate session id + wallet overview as soon as the proof screen mounts.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveSessionPublicId();
      if (cancelled || !resolved) {
        return;
      }
      setSessionPublicId(resolved);
      try {
        const payload = await fetchDepositStatus();
        const active = payload.status.activeSession;
        if (
          active?.publicId === resolved &&
          isProofEligibleStatus(active.status)
        ) {
          setOverview(
            getDepositProofOverview({
              recipientAddress: active.walletAddress,
              networkLabel: active.networkLabel || active.network,
              amountUsdt: active.amountUsdt,
              amountDisplay: active.amountDisplay,
            }),
          );
        }
      } catch {
        // Keep presentation overview; submit still uses resolved session id.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount + when route param appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSessionId]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DepositProofValues>({
    resolver: zodResolver(depositProofSchema),
    defaultValues: {
      txid: '',
      senderExchange: '',
    },
    mode: 'onSubmit',
  });

  const receipt = useWatch({ control, name: 'receipt' });

  const goBackToDeposit = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/deposit');
  };

  const onCopyAddress = async () => {
    if (!session.recipientAddress.trim()) {
      showAlert(
        'Deposit wallet not configured',
        'No recipient address is available for this deposit session yet.',
      );
      return;
    }
    await Clipboard.setStringAsync(session.recipientAddress);
    setCopyLabel(DEPOSIT_PROOF_COPY.copied);
    setTimeout(() => setCopyLabel(DEPOSIT_PROOF_COPY.copy), 2000);
  };

  const onPasteTxid = async () => {
    const text = await Clipboard.getStringAsync();
    if (text.trim()) {
      setValue('txid', text.trim(), { shouldValidate: true, shouldDirty: true });
    }
  };

  const onPickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        'Permission needed',
        'Allow photo library access to attach a deposit screenshot.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const name =
      asset.fileName ??
      `deposit-screenshot.${mimeType === 'image/png' ? 'png' : 'jpg'}`;
    const size = asset.fileSize ?? 0;

    applyReceipt(setValue, {
      uri: asset.uri,
      name,
      size: size > 0 ? size : 0,
      mimeType,
    });
  };

  const onTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        'Permission needed',
        'Allow camera access to photograph your deposit receipt.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    applyReceipt(setValue, {
      uri: asset.uri,
      name: asset.fileName ?? `deposit-photo.jpg`,
      size: asset.fileSize ?? 0,
      mimeType,
    });
  };

  const onPickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    applyReceipt(setValue, {
      uri: asset.uri,
      name: asset.name,
      size: asset.size ?? 0,
      mimeType: asset.mimeType ?? 'application/pdf',
    });
  };

  /**
   * Web has no native action sheet — `Alert.alert` with multiple buttons is
   * a no-op on react-native-web, so the Android/web branch below never
   * actually opened a picker. Use a single native `<input type="file">`
   * (via DocumentPicker, which works cross-platform) accepting all
   * supported receipt types instead of forcing a screenshot/PDF choice.
   */
  const onPickReceiptWeb = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...DEPOSIT_PROOF_COPY.acceptedMimeTypes],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    applyReceipt(setValue, {
      uri: asset.uri,
      name: asset.name,
      size: asset.size ?? 0,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const onPickReceipt = () => {
    if (Platform.OS === 'web') {
      void onPickReceiptWeb();
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Cancel',
            DEPOSIT_PROOF_COPY.pickScreenshot,
            DEPOSIT_PROOF_COPY.takePhoto,
            DEPOSIT_PROOF_COPY.pickPdf,
          ],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void onPickScreenshot();
          if (index === 2) void onTakePhoto();
          if (index === 3) void onPickPdf();
        },
      );
      return;
    }

    Alert.alert(DEPOSIT_PROOF_COPY.receiptLabel, undefined, [
      {
        text: DEPOSIT_PROOF_COPY.pickScreenshot,
        onPress: () => void onPickScreenshot(),
      },
      { text: DEPOSIT_PROOF_COPY.takePhoto, onPress: () => void onTakePhoto() },
      { text: DEPOSIT_PROOF_COPY.pickPdf, onPress: () => void onPickPdf() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onSelectExchange = (name: string) => {
    setSelectedChip(name);
    setValue('senderExchange', name, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    const advanceToUnderReview = (source: 'presentation' | 'api') => {
      markUnderReview({
        amountUsdt: session.amountUsdt,
        amountDisplay: session.amountDisplay,
        currency: session.currency,
        networkLabel: 'TRC-20 (Tron)',
        txid: values.txid.trim(),
        receipt: values.receipt,
        senderExchange: values.senderExchange?.trim() || undefined,
        submittedAtIso: new Date().toISOString(),
        confirmationsDone: 0,
        confirmationsTotal: 19,
        source,
      });
      router.replace('/');
    };

    const sessionPublicId = await resolveSessionPublicId();
    if (!sessionPublicId) {
      showAlert(
        DEPOSIT_PROOF_COPY.submitUnavailableTitle,
        'Start deposit from Make Deposit again so Clearpay can attach a session id.',
      );
      return;
    }

    try {
      await submitDepositProof({
        publicId: sessionPublicId,
        txid: values.txid,
        receiptUri: values.receipt.uri,
        receiptName: values.receipt.name,
        receiptMimeType: values.receipt.mimeType,
        receiptSizeBytes:
          values.receipt.size > 0 ? values.receipt.size : undefined,
        senderExchange: values.senderExchange?.trim() || undefined,
      });
      // Best-effort cache refresh — must never block/fail the already-
      // successful submission from advancing the UI.
      queryClient
        .invalidateQueries({ queryKey: ['customer', 'deposit', 'status'] })
        .catch(() => undefined);
      advanceToUnderReview('api');
    } catch (error) {
      showAlert(
        DEPOSIT_PROOF_COPY.submitUnavailableTitle,
        error instanceof ApiClientError
          ? error.message
          : DEPOSIT_PROOF_COPY.submitUnavailableBody,
      );
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FF]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <ClearpayAppHeader
          badge={DEPOSIT_PROOF_COPY.flowBadge}
          onBack={goBackToDeposit}
          onClose={goBackToDeposit}
          onHelp={() =>
            showAlert(
              'Help',
              'Use your wallet or exchange withdrawal history to find the TXID, then attach a clear receipt screenshot.',
            )
          }
        />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step header */}
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Text
              accessibilityRole="header"
              className="flex-1 text-xl font-bold text-[#0D1C32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {DEPOSIT_PROOF_COPY.title}
            </Text>
            <View className="rounded-full bg-[#D6E3FF] px-2.5 py-0.5">
              <Text
                className="text-[12px] font-bold text-[#0058BC]"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {DEPOSIT_PROOF_COPY.stepLabel}
              </Text>
            </View>
          </View>

          <View className="mb-1.5 flex-row gap-1.5">
            <View className="h-1.5 flex-1 rounded-full bg-[#0058BC]" />
            <LinearGradient
              colors={['#0058BC', '#57FDC8']}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={{ flex: 1, height: 6, borderRadius: 999 }}
            />
          </View>
          <View className="mb-4 flex-row justify-between">
            <Text
              className="text-[12px] text-[#414754]"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              {DEPOSIT_PROOF_COPY.stepDone}
            </Text>
            <Text
              className="text-[12px] font-semibold text-[#0058BC]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {DEPOSIT_PROOF_COPY.stepCurrent}
            </Text>
          </View>

          {/* Deposit overview */}
          <View
            className="mb-4 rounded-xl bg-white p-4"
            style={{
              shadowColor: '#0B1F3A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                className="text-[12px] font-medium text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {DEPOSIT_PROOF_COPY.overviewLabel}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-[#DFE8FF] px-2 py-0.5">
                <View className="h-1.5 w-1.5 rounded-full bg-[#0058BC]" />
                <Text
                  className="text-[11px] font-semibold text-[#0058BC]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {DEPOSIT_PROOF_COPY.statusAwaiting}
                </Text>
              </View>
            </View>

            <View className="mb-3 flex-row items-end justify-between">
              <View>
                <Text
                  className="text-[12px] text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  {DEPOSIT_PROOF_COPY.amountLabel}
                </Text>
                <View className="mt-0.5 flex-row items-baseline gap-1.5">
                  <Text
                    className="text-2xl font-bold tracking-tight text-[#0D1C32]"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {session.amountDisplay}
                  </Text>
                  <Text
                    className="text-sm font-bold text-[#0058BC]"
                    style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                  >
                    {DEPOSIT_PROOF_COPY.asset}
                  </Text>
                </View>
              </View>
              <View className="rounded bg-[#E8EEFF] px-2 py-1">
                <Text
                  className="text-[11px] font-bold text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {session.network}
                </Text>
              </View>
            </View>

            <View className="rounded-lg bg-[#F0F3FF] p-3">
              <View className="mb-1 flex-row items-center justify-between">
                <Text
                  className="text-[12px] font-medium text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                >
                  {DEPOSIT_PROOF_COPY.recipientLabel}
                </Text>
                <Pressable
                  accessibilityLabel="Copy recipient address"
                  accessibilityRole="button"
                  className="min-h-[36px] flex-row items-center gap-1 px-1"
                  onPress={onCopyAddress}
                >
                  <Copy color="#0058BC" size={16} />
                  <Text
                    className="text-[12px] font-semibold text-[#0058BC]"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {copyLabel}
                  </Text>
                </Pressable>
              </View>
              <Text
                selectable
                className="font-mono text-[13px] leading-5 text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {session.recipientAddress}
              </Text>
            </View>
          </View>

          {/* TXID */}
          <View className="mb-4">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text
                className="text-[14px] font-semibold text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_PROOF_COPY.txidLabel}{' '}
                <Text className="font-bold text-[#BA1A1A]">*</Text>
              </Text>
              <Text
                className="text-[12px] text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {DEPOSIT_PROOF_COPY.required}
              </Text>
            </View>
            <Controller
              control={control}
              name="txid"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  className="flex-row items-center rounded-xl bg-white px-3.5"
                  style={{
                    borderWidth: 1,
                    borderColor: errors.txid ? '#BA1A1A' : 'transparent',
                    shadowColor: '#0B1F3A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <TextInput
                    accessibilityLabel={DEPOSIT_PROOF_COPY.txidLabel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="min-h-[48px] flex-1 py-3 pr-2 text-[14px] text-[#0D1C32]"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder={DEPOSIT_PROOF_COPY.txidPlaceholder}
                    placeholderTextColor="#C1C6D6"
                    style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                    value={value}
                  />
                  <Pressable
                    accessibilityLabel="Paste transaction hash"
                    accessibilityRole="button"
                    className="min-h-[36px] rounded-lg bg-[#E8EEFF] px-2.5 py-1.5"
                    onPress={onPasteTxid}
                  >
                    <Text
                      className="text-[12px] font-semibold text-[#0058BC]"
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {DEPOSIT_PROOF_COPY.paste}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
            {errors.txid ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-1.5 text-[12px] text-[#BA1A1A]"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {errors.txid.message}
              </Text>
            ) : (
              <View className="mt-1.5 flex-row items-center gap-1">
                <Info color="#727785" size={14} />
                <Text
                  className="flex-1 text-[12px] text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  {DEPOSIT_PROOF_COPY.txidHelp}
                </Text>
              </View>
            )}
          </View>

          {/* Receipt upload */}
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className="text-[14px] font-semibold text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_PROOF_COPY.receiptLabel}{' '}
                <Text className="font-bold text-[#BA1A1A]">*</Text>
              </Text>
              {receipt ? (
                <Text
                  className="text-[12px] font-semibold text-[#006C51]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {DEPOSIT_PROOF_COPY.fileAttached}
                </Text>
              ) : (
                <Text
                  className="text-[12px] text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                >
                  {DEPOSIT_PROOF_COPY.required}
                </Text>
              )}
            </View>

            <Pressable
              accessibilityHint="Opens file picker for PNG, JPG, or PDF"
              accessibilityLabel={DEPOSIT_PROOF_COPY.uploadTitle}
              accessibilityRole="button"
              className="items-center rounded-xl bg-white px-4 py-4 active:bg-[#F0F3FF]"
              onPress={onPickReceipt}
              style={{
                shadowColor: '#0B1F3A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 1,
                borderWidth: errors.receipt ? 1 : 0,
                borderColor: errors.receipt ? '#BA1A1A' : 'transparent',
              }}
            >
              <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-[#E8EEFF]">
                <CloudUpload color="#0058BC" size={22} />
              </View>
              <Text
                className="text-[14px] font-semibold text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_PROOF_COPY.uploadTitle}
              </Text>
              <Text
                className="mt-0.5 text-[12px] text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {DEPOSIT_PROOF_COPY.uploadHint}
              </Text>
            </Pressable>

            {errors.receipt ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-1.5 text-[12px] text-[#BA1A1A]"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {errors.receipt.message ?? 'Attach a receipt file'}
              </Text>
            ) : null}

            {receipt ? (
              <View
                className="mt-2 flex-row items-center justify-between rounded-xl bg-white p-3"
                style={{
                  shadowColor: '#0B1F3A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#DFE8FF]">
                    <CheckCircle2 color="#006C51" size={20} strokeWidth={2.25} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[13px] font-semibold text-[#0D1C32]"
                      numberOfLines={1}
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {receipt.name}
                    </Text>
                    <Text
                      className="text-[12px] text-[#414754]"
                      style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
                    >
                      {formatFileSize(receipt.size)} • {DEPOSIT_PROOF_COPY.fileComplete}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Replace receipt file"
                  accessibilityRole="button"
                  className="min-h-[40px] justify-center px-2"
                  onPress={onPickReceipt}
                >
                  <Text
                    className="text-[13px] font-semibold text-[#0058BC]"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {DEPOSIT_PROOF_COPY.replace}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Exchange optional */}
          <View className="mb-4">
            <View className="mb-1.5 flex-row items-center justify-between">
              <Text
                className="text-[14px] font-semibold text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {DEPOSIT_PROOF_COPY.exchangeLabel}
              </Text>
              <Text
                className="text-[12px] text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
              >
                {DEPOSIT_PROOF_COPY.optional}
              </Text>
            </View>
            <Controller
              control={control}
              name="senderExchange"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  accessibilityLabel={DEPOSIT_PROOF_COPY.exchangeLabel}
                  className="min-h-[48px] rounded-xl bg-white px-3.5 py-3 text-[14px] text-[#0D1C32]"
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    setSelectedChip(null);
                    onChange(text);
                  }}
                  placeholder={DEPOSIT_PROOF_COPY.exchangePlaceholder}
                  placeholderTextColor="#C1C6D6"
                  style={{
                    fontFamily: 'PlusJakartaSans_400Regular',
                    shadowColor: '#0B1F3A',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                  value={value}
                />
              )}
            />
            <View className="mt-2 flex-row flex-wrap gap-2">
              {DEPOSIT_PROOF_COPY.exchangeChips.map((chip) => {
                const active = selectedChip === chip;
                return (
                  <Pressable
                    key={chip}
                    accessibilityLabel={`Select ${chip}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full px-3 py-1.5 ${active ? 'bg-[#D8E2FF]' : 'bg-white'}`}
                    onPress={() => onSelectExchange(chip)}
                    style={{
                      shadowColor: '#0B1F3A',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text
                      className={`text-[12px] font-semibold ${active ? 'text-[#001A41]' : 'text-[#414754]'}`}
                      style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                    >
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notice */}
          <View className="mb-4 flex-row items-start gap-3 rounded-xl bg-[#E8EEFF] p-3.5">
            <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-[#D8E2FF]">
              <ShieldCheck color="#0058BC" size={16} />
            </View>
            <Text
              className="flex-1 text-[12px] leading-5 text-[#414754]"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              {notice}
            </Text>
          </View>

          {/* Actions */}
          <Pressable
            accessibilityLabel={DEPOSIT_PROOF_COPY.submit}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={onSubmit}
            style={({ pressed }) => [{ opacity: pressed || isSubmitting ? 0.92 : 1 }]}
          >
            <LinearGradient
              colors={['#0052FF', '#00D4B2']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={{
                minHeight: 52,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 24,
              }}
            >
              <Text
                className="text-[15px] font-bold text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {DEPOSIT_PROOF_COPY.submit}
              </Text>
              <ArrowRight color="#FFFFFF" size={20} />
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityLabel={DEPOSIT_PROOF_COPY.cancel}
            accessibilityRole="button"
            className="mt-3 min-h-[44px] items-center justify-center py-2.5"
            onPress={goBackToDeposit}
          >
            <Text
              className="text-[13px] font-semibold text-[#414754]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {DEPOSIT_PROOF_COPY.cancel}
            </Text>
          </Pressable>

          <View className="mt-3 flex-row items-center justify-center gap-1.5">
            <ShieldCheck color="#006C51" size={16} />
            <Text
              className="text-center text-[11px] text-[#414754]"
              style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
            >
              {DEPOSIT_PROOF_TRUST_STAMP.text}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
