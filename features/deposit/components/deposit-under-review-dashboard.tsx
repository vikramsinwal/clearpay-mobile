import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Clock,
  Copy,
  Eye,
  LayoutDashboard,
  Lock,
  RefreshCw,
  Headphones,
  X,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClearpayAppHeader } from '@/components/brand/clearpay-app-header';
import { TelegramIcon } from '@/components/icons/telegram-icon';
import {
  DEPOSIT_UNDER_REVIEW_COPY,
  formatSubmittedLocalTime,
  formatSubmittedUtcTime,
  truncateTxid,
} from '@/constants/deposit-under-review';
import { DepositReviewShield } from '@/features/deposit/components/deposit-review-shield';
import type { DepositUnderReviewSubmission } from '@/stores/deposit-flow-store';
import { getTelegramBotUrl } from '@/lib/env';

type DepositUnderReviewDashboardProps = {
  submission: DepositUnderReviewSubmission;
  telegramHandle?: string | null;
  onBackToDashboard?: () => void;
  onCloseFlow?: () => void;
};

/**
 * Main Home dashboard while an initial deposit is under verification review.
 */
export function DepositUnderReviewDashboard({
  submission,
  telegramHandle,
  onBackToDashboard,
  onCloseFlow,
}: DepositUnderReviewDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);

  const handleLabel =
    telegramHandle?.trim() || DEPOSIT_UNDER_REVIEW_COPY.telegramFallbackHandle;
  const displayHandle = handleLabel.startsWith('@')
    ? handleLabel
    : handleLabel === DEPOSIT_UNDER_REVIEW_COPY.telegramFallbackHandle
      ? handleLabel
      : `@${handleLabel}`;

  const confirmationDetail = `${DEPOSIT_UNDER_REVIEW_COPY.step2Detail} ${submission.confirmationsDone}/${submission.confirmationsTotal}`;

  const onCopyTxid = async () => {
    try {
      await Clipboard.setStringAsync(submission.txid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      Alert.alert('Copy failed', 'Unable to copy the transaction hash.');
    }
  };

  const onContactSupport = async () => {
    const url = getTelegramBotUrl();
    if (!url) {
      Alert.alert(
        DEPOSIT_UNDER_REVIEW_COPY.supportUnavailableTitle,
        DEPOSIT_UNDER_REVIEW_COPY.supportUnavailableBody,
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        DEPOSIT_UNDER_REVIEW_COPY.supportUnavailableTitle,
        DEPOSIT_UNDER_REVIEW_COPY.supportUnavailableBody,
      );
    }
  };

  const onHelp = () => {
    Alert.alert(
      'Deposit review',
      'Verification usually completes within 10–30 minutes. Keep this screen open or return later — we will notify you on Telegram when approved.',
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F9FF]" edges={['top', 'bottom']}>
      <ClearpayAppHeader
        badge={DEPOSIT_UNDER_REVIEW_COPY.flowBadge}
        onHelp={onHelp}
        onClose={onCloseFlow}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 28,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status hero */}
        <View
          className="items-center overflow-hidden rounded-xl bg-white p-5"
          style={{
            shadowColor: '#0A192F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <DepositReviewShield />

          <View className="mb-2.5 flex-row items-center gap-1.5 rounded-full bg-[#E8EEFF] px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-[#0058BC]" />
            <Text
              className="text-[12px] font-medium text-[#414754]"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {DEPOSIT_UNDER_REVIEW_COPY.statusPill}
            </Text>
          </View>

          <Text
            accessibilityRole="header"
            className="mb-2 text-center text-[22px] font-bold tracking-tight text-[#0D1C32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.title}
          </Text>
          <Text
            className="max-w-[340px] text-center text-[13px] leading-5 text-[#414754]"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.body}
          </Text>

          <View className="mt-4 w-full flex-row items-center justify-between rounded-lg bg-[#F0F3FF] px-2.5 py-2.5">
            <View className="flex-row items-center gap-2">
              <Clock color="#0058BC" size={18} />
              <Text
                className="text-[12px] font-medium text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {DEPOSIT_UNDER_REVIEW_COPY.estLabel}
              </Text>
            </View>
            <Text
              className="text-[12px] font-bold text-[#0058BC]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {DEPOSIT_UNDER_REVIEW_COPY.estValue}
            </Text>
          </View>
        </View>

        {/* Submitted details */}
        <View
          className="rounded-xl bg-white p-4"
          style={{
            shadowColor: '#0A192F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="mb-1 flex-row items-center justify-between pb-1">
            <Text
              className="text-[15px] font-bold text-[#0D1C32]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {DEPOSIT_UNDER_REVIEW_COPY.detailsTitle}
            </Text>
            <View className="rounded-full bg-[#E8EEFF] px-2 py-0.5">
              <Text
                className="text-[11px] font-medium text-[#414754]"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                {DEPOSIT_UNDER_REVIEW_COPY.instantMatch}
              </Text>
            </View>
          </View>

          <DetailRow
            label={DEPOSIT_UNDER_REVIEW_COPY.amountLabel}
            value={`${submission.amountDisplay} ${submission.currency}`}
            valueBold
          />
          <DetailRow
            label={DEPOSIT_UNDER_REVIEW_COPY.networkLabel}
            right={
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full bg-[#006C51]" />
                <Text
                  className="text-[13px] font-medium text-[#0D1C32]"
                  style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                >
                  {submission.networkLabel}
                </Text>
              </View>
            }
          />
          <DetailRow
            label={DEPOSIT_UNDER_REVIEW_COPY.txidLabel}
            right={
              <View className="flex-row items-center gap-1">
                <View className="rounded bg-[#E8EEFF] px-2 py-0.5">
                  <Text
                    className="font-mono text-[12px] text-[#0D1C32]"
                    style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                  >
                    {truncateTxid(submission.txid)}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={DEPOSIT_UNDER_REVIEW_COPY.copyTxid}
                  accessibilityRole="button"
                  className="h-8 w-8 items-center justify-center rounded-full active:bg-[#DFE8FF]"
                  onPress={onCopyTxid}
                >
                  {copied ? (
                    <Check color="#006C51" size={17} strokeWidth={2.5} />
                  ) : (
                    <Copy color="#0058BC" size={17} />
                  )}
                </Pressable>
              </View>
            }
          />
          <DetailRow
            label={DEPOSIT_UNDER_REVIEW_COPY.proofLabel}
            right={
              <Pressable
                accessibilityLabel="Preview payment proof"
                accessibilityRole="button"
                className="flex-row items-center gap-1"
                onPress={() => setProofOpen((open) => !open)}
              >
                <Text
                  className="text-[12px] font-semibold text-[#0058BC]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {DEPOSIT_UNDER_REVIEW_COPY.proofCount}
                </Text>
                <Eye color="#0058BC" size={16} />
              </Pressable>
            }
          />
          <DetailRow
            label={DEPOSIT_UNDER_REVIEW_COPY.submittedLabel}
            value={formatSubmittedLocalTime(submission.submittedAtIso)}
          />
        </View>

        {proofOpen ? (
          <View className="rounded-xl bg-[#DFE8FF] p-3">
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className="text-[12px] font-bold text-[#0D1C32]"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {DEPOSIT_UNDER_REVIEW_COPY.proofPreviewTitle}
              </Text>
              <Pressable
                accessibilityLabel="Close proof preview"
                accessibilityRole="button"
                onPress={() => setProofOpen(false)}
              >
                <X color="#727785" size={18} />
              </Pressable>
            </View>
            {submission.receipt.uri &&
            (submission.receipt.mimeType?.startsWith('image/') ||
              /\.(png|jpe?g|webp)$/i.test(submission.receipt.name)) ? (
              <Image
                accessibilityLabel="Uploaded payment receipt"
                className="h-32 w-full rounded-lg bg-white"
                resizeMode="cover"
                source={{ uri: submission.receipt.uri }}
              />
            ) : (
              <View className="h-20 items-center justify-center rounded-lg bg-white">
                <Text
                  className="text-[13px] font-medium text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
                >
                  {submission.receipt.name}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Timeline */}
        <View
          className="rounded-xl bg-white p-4"
          style={{
            shadowColor: '#0A192F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text
            className="mb-3 text-[15px] font-bold text-[#0D1C32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.nextTitle}
          </Text>

          <View className="relative pl-6">
            <View className="absolute bottom-2 left-[9px] top-2 w-0.5 bg-[#DFE8FF]" />

            <TimelineStep
              icon={<Check color="#FFFFFF" size={12} strokeWidth={3} />}
              iconBg="#006C51"
              subtitle={formatSubmittedUtcTime(submission.submittedAtIso)}
              title={DEPOSIT_UNDER_REVIEW_COPY.step1Title}
            />
            <TimelineStep
              active
              icon={<RefreshCw color="#FFFFFF" size={12} strokeWidth={2.5} />}
              iconBg="#0058BC"
              ring
              subtitle={confirmationDetail}
              title={DEPOSIT_UNDER_REVIEW_COPY.step2Title}
              titleColor="#0058BC"
            />
            <TimelineStep
              dimmed
              icon={<Lock color="#727785" size={12} strokeWidth={2.5} />}
              iconBg="#DFE8FF"
              subtitle={DEPOSIT_UNDER_REVIEW_COPY.step3Detail}
              title={DEPOSIT_UNDER_REVIEW_COPY.step3Title}
            />
          </View>
        </View>

        {/* Telegram notice */}
        <View className="flex-row items-start gap-3 rounded-xl bg-[#F0F3FF] p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
            <TelegramIcon color="#0058BC" size={20} />
          </View>
          <Text
            className="flex-1 text-[13px] leading-5 text-[#0D1C32]"
            style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
          >
            {DEPOSIT_UNDER_REVIEW_COPY.telegramPrefix}
            <Text
              className="font-bold text-[#0058BC]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {displayHandle}
            </Text>
            {DEPOSIT_UNDER_REVIEW_COPY.telegramSuffix}
          </Text>
        </View>

        {/* Actions */}
        <View className="gap-2.5 pt-1">
          <Pressable
            accessibilityLabel={DEPOSIT_UNDER_REVIEW_COPY.backToDashboard}
            accessibilityRole="button"
            onPress={onBackToDashboard ?? onCloseFlow}
            style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
          >
            <LinearGradient
              colors={['#0058BC', '#008096']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={{
                height: 48,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#0058BC',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <LayoutDashboard color="#FFFFFF" size={20} />
              <Text
                className="text-[14px] font-bold text-white"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {DEPOSIT_UNDER_REVIEW_COPY.backToDashboard}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            accessibilityLabel={DEPOSIT_UNDER_REVIEW_COPY.contactSupport}
            accessibilityRole="button"
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white"
            onPress={onContactSupport}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.92 : 1,
                shadowColor: '#0A192F',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 1,
              },
            ]}
          >
            <Headphones color="#006577" size={20} />
            <Text
              className="text-[14px] font-semibold text-[#0D1C32]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {DEPOSIT_UNDER_REVIEW_COPY.contactSupport}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  valueBold,
  right,
}: {
  label: string;
  value?: string;
  valueBold?: boolean;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text
        className="text-[13px] text-[#414754]"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      >
        {label}
      </Text>
      {right ?? (
        <Text
          className={`text-right text-[13px] text-[#0D1C32] ${valueBold ? 'font-extrabold tracking-tight' : 'font-medium'}`}
          style={{
            fontFamily: valueBold
              ? 'PlusJakartaSans_700Bold'
              : 'PlusJakartaSans_500Medium',
          }}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

function TimelineStep({
  title,
  subtitle,
  icon,
  iconBg,
  active,
  dimmed,
  ring,
  titleColor,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBg: string;
  active?: boolean;
  dimmed?: boolean;
  ring?: boolean;
  titleColor?: string;
}) {
  return (
    <View className={`relative mb-5 flex-row items-start ${dimmed ? 'opacity-60' : ''}`}>
      <View
        className="absolute -left-6 top-0.5 h-5 w-5 items-center justify-center rounded-full"
        style={{
          backgroundColor: iconBg,
          ...(ring
            ? {
                shadowColor: '#0058BC',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
                elevation: 2,
              }
            : null),
        }}
      >
        {icon}
      </View>
      <View className="flex-1 pl-1">
        <Text
          className={`text-[13px] ${active ? 'font-bold' : 'font-medium'} text-[#0D1C32]`}
          style={{
            fontFamily: active
              ? 'PlusJakartaSans_700Bold'
              : 'PlusJakartaSans_500Medium',
            color: titleColor ?? '#0D1C32',
          }}
        >
          {title}
        </Text>
        <Text
          className="text-[12px] text-[#414754]"
          style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}
