import {
  BadgeCheck,
  Check,
  Copy,
  Download,
  Hourglass,
  Landmark,
  Lock,
  Phone,
  Receipt,
  TrendingUp,
  ZoomIn,
} from 'lucide-react-native';
import { Platform, Pressable, Text, View } from 'react-native';

import { OCR_LABEL, PAYIN_COPY, PAYIN_STATUS_LABEL } from '@/constants/payin';
import { formatCommission, formatMoneyMinor, formatOrderTimestamp } from '@/features/payin/lib/format';
import { SmsPaymentVerificationService } from '@/features/payin/sms/sms-payment-verification';
import type { PayinOrderDetail, PayinTimelineEvent, VerificationCheck } from '@/features/payin/types';

type PayinOrderDetailBodyProps = {
  order: PayinOrderDetail;
  countdownLabel: string;
  expired: boolean;
  expiringSoon: boolean;
  timeZone?: string | null;
  verified: number;
  totalChecks: number;
  canZoom: boolean;
  slipBusy: boolean;
  smsChoice: 'unknown' | 'enabled' | 'declined';
  onCopyOrderId: () => void;
  onCopyUtr: () => void;
  onCall: () => void;
  onZoom: () => void;
  onDownload: () => void;
  onEnableSms: () => void;
};

export function PayinOrderDetailBody({
  order,
  countdownLabel,
  expired,
  expiringSoon,
  timeZone,
  verified,
  totalChecks,
  canZoom,
  slipBusy,
  smsChoice,
  onCopyOrderId,
  onCopyUtr,
  onCall,
  onZoom,
  onDownload,
  onEnableSms,
}: PayinOrderDetailBodyProps) {
  const amount = moneyParts(order.expectedInboundAmountMinor, order.currency);
  const earning =
    order.traderEarningMinor == null
      ? null
      : moneyParts(order.traderEarningMinor, order.currency);
  const ocrText = ocrLabel(order);
  const receipt = order.receipt;
  const payeeLine =
    receipt?.payeeDetail ??
    (receipt?.payeeName
      ? `To: ${receipt.payeeName}${order.merchantProvider ? ` • ${order.merchantProvider}` : ''}`
      : null);
  const receiptAmount =
    receipt?.amountMinor == null
      ? null
      : formatMoneyMinor(receipt.amountMinor, receipt.currency ?? order.currency);

  return (
    <View className="gap-4 px-4 pt-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityLabel="Copy order ID"
          className="flex-row items-center gap-1.5 rounded-full bg-[#e8eeff] px-2.5 py-1 active:opacity-80"
          onPress={onCopyOrderId}
        >
          <Text
            className="text-[12px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            #{order.displayId}
          </Text>
          <Copy color="#414754" size={15} />
        </Pressable>
        <View
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${
            expired ? 'bg-[#e8eeff]' : 'bg-[#ffdad6]'
          }`}
        >
          <View className={`h-2 w-2 rounded-full ${expired ? 'bg-[#727785]' : 'bg-[#ba1a1a]'}`} />
          <Text
            className={`text-[12px] ${expired ? 'text-[#414754]' : 'text-[#93000a]'}`}
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {expired ? PAYIN_COPY.expired : PAYIN_COPY.expiresIn}
          </Text>
          {expired ? null : (
            <Text
              className={`text-[12px] ${expiringSoon ? 'text-[#ba1a1a]' : 'text-[#93000a]'}`}
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {countdownLabel}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center justify-between rounded-xl bg-[#dfe8ff] p-4">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[11px] uppercase tracking-wider text-[#414754]">
            {PAYIN_COPY.transactionType}
          </Text>
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <Text
              className="text-[18px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {order.transactionType}
            </Text>
            {order.tier ? (
              <View className="rounded-full bg-[#d8e2ff] px-2 py-0.5">
                <Text
                  className="text-[11px] text-[#001a41]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {order.tier}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <Landmark color="#0058bc" size={22} />
        </View>
      </View>

      <View className="rounded-xl bg-white p-4 shadow-sm">
        <Text className="text-[11px] uppercase tracking-wider text-[#414754]">
          {PAYIN_COPY.statusSection}
        </Text>
        <Text
          className="mt-1 text-[18px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {PAYIN_STATUS_LABEL[order.status]}
        </Text>
      </View>

      <View className="rounded-xl bg-white p-4 shadow-sm">
        <Text
          className="mb-3 text-[14px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {PAYIN_COPY.paymentSummary}
        </Text>
        <SummaryRow
          label={PAYIN_COPY.payinAmount}
          value={formatMoneyMinor(order.expectedInboundAmountMinor, order.currency)}
        />
        <SummaryRow label={PAYIN_COPY.currency} value={order.currency} />
        {order.feeMinor != null ? (
          <SummaryRow
            label={PAYIN_COPY.payinFee}
            value={formatMoneyMinor(order.feeMinor, order.currency)}
          />
        ) : null}
        {order.netAmountMinor != null ? (
          <SummaryRow
            label={PAYIN_COPY.netAmount}
            value={formatMoneyMinor(order.netAmountMinor, order.currency)}
          />
        ) : null}
        {order.createdAt ? (
          <SummaryRow label={PAYIN_COPY.createdAt} value={formatOrderTimestamp(order.createdAt, timeZone)} />
        ) : null}
        {order.expiresAt ? (
          <SummaryRow
            label={PAYIN_COPY.deadline}
            value={expired ? PAYIN_COPY.expired : formatOrderTimestamp(order.expiresAt, timeZone)}
          />
        ) : null}
      </View>

      <View className="rounded-xl bg-white p-4 shadow-sm">
        <Text
          className="mb-3 text-[14px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
        >
          {PAYIN_COPY.accountSection}
        </Text>
        <SummaryRow
          label={PAYIN_COPY.accountName}
          value={order.assignedAccountName ?? order.assignedAccountLabel ?? '—'}
        />
        {order.assignedAccountType ? (
          <SummaryRow label={PAYIN_COPY.accountType} value={order.assignedAccountType} />
        ) : null}
        {order.merchantProvider ? (
          <SummaryRow label={PAYIN_COPY.accountProvider} value={order.merchantProvider} />
        ) : null}
        {order.assignedAccountMasked || order.merchantVirtualAddress ? (
          <SummaryRow
            label={PAYIN_COPY.maskedDetails}
            value={order.assignedAccountMasked ?? order.merchantVirtualAddress ?? '—'}
          />
        ) : null}
        {order.assignedAccountStatus ? (
          <SummaryRow
            label={PAYIN_COPY.statusSection}
            value={
              order.assignedAccountStatus.toUpperCase() === 'ACTIVE'
                ? PAYIN_COPY.accountActive
                : order.assignedAccountStatus
            }
          />
        ) : null}
        {order.assignedAccountConnectivity ? (
          <SummaryRow label={PAYIN_COPY.connectivity} value={order.assignedAccountConnectivity} />
        ) : null}
      </View>

      {order.paymentInstructions.length > 0 ? (
        <View className="rounded-xl bg-white p-4 shadow-sm">
          <Text
            className="mb-3 text-[14px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYIN_COPY.instructions}
          </Text>
          {order.paymentInstructions.map((item, index) => (
            <View key={`${item.body}-${index}`} className="mb-2">
              {item.title ? (
                <Text
                  className="text-[12px] text-[#414754]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {item.title}
                </Text>
              ) : null}
              <Text className="text-[13px] leading-5 text-[#0d1c32]">{item.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {order.timeline.length > 0 ? (
        <View className="rounded-xl bg-white p-4 shadow-sm">
          <Text
            className="mb-3 text-[14px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
          >
            {PAYIN_COPY.timeline}
          </Text>
          {order.timeline.map((event) => (
            <TimelineRow key={event.key} event={event} timeZone={timeZone} />
          ))}
        </View>
      ) : null}

      <View className="rounded-xl bg-white p-4 shadow-sm">
        <View className="items-center py-1">
          <Text className="mb-1 text-[11px] uppercase tracking-wider text-[#414754]">
            {PAYIN_COPY.expectedAmount}
          </Text>
          <View className="flex-row items-end">
            {amount.symbol ? (
              <Text
                className="text-[24px] text-[#006c51]"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {amount.symbol}
              </Text>
            ) : null}
            <Text
              className="text-[30px] tracking-tight text-[#006c51]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {amount.value}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-1.5 rounded-full bg-[#f0f3ff] px-3 py-1">
            <TrendingUp color="#006c51" size={16} />
            <Text
              className="text-[12px] text-[#006c51]"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              {PAYIN_COPY.traderEarning}:{' '}
              {earning ? `+${earning.symbol} ${earning.value}` : '—'}
              {order.traderCommissionPercentage == null
                ? ''
                : ` (${formatCommission(order.traderCommissionPercentage)})`}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-lg bg-[#f0f3ff] p-3">
          <View className="min-w-0 flex-1 pr-2">
            <View className="flex-row items-center gap-1">
              <Text className="text-[11px] text-[#414754]">{PAYIN_COPY.utrLabel}</Text>
              {order.utr ? <BadgeCheck color="#0058bc" size={14} /> : null}
            </View>
            <Text
              className="text-[18px] tracking-wide text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {order.utr ?? PAYIN_COPY.awaitingUtr}
            </Text>
          </View>
          {order.utr ? (
            <Pressable
              accessibilityLabel="Copy UTR"
              className="h-10 w-10 items-center justify-center rounded-lg bg-white"
              onPress={onCopyUtr}
            >
              <Copy color="#0058bc" size={18} />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-2 gap-3 rounded-lg bg-[#f0f3ff] p-3">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-[11px] text-[#414754]">{PAYIN_COPY.remitter}</Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <Text
                  className="text-[14px] text-[#0d1c32]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {order.remitterName}
                </Text>
                {order.remitterVerified ? <Check color="#006c51" size={15} /> : null}
              </View>
            </View>
            {order.remitterPhone ? (
              <Pressable
                accessibilityLabel={PAYIN_COPY.callRemitter}
                className="flex-row items-center gap-1"
                onPress={onCall}
              >
                <Text
                  className="text-[12px] text-[#0058bc]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {displayPhone(order.remitterPhone)}
                </Text>
                <Phone color="#0058bc" size={16} />
              </Pressable>
            ) : null}
          </View>

          <View className="h-px bg-[#c1c6d6]/30" />

          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-[#414754]">{PAYIN_COPY.assignedAccount}</Text>
              {order.merchantProvider ? (
                <View className="rounded-full bg-[#0058bc] px-2 py-0.5">
                  <Text
                    className="text-[11px] text-white"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {order.merchantProvider}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className="min-w-0 flex-1 text-[14px] text-[#0d1c32]"
                numberOfLines={1}
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {order.merchantVirtualAddress ?? '—'}
              </Text>
              {order.assignedAccountName ? (
                <Text className="text-[13px] text-[#414754]">({order.assignedAccountName})</Text>
              ) : null}
            </View>
          </View>

          <View className="h-px bg-[#c1c6d6]/30" />

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] text-[#414754]">{PAYIN_COPY.orderInitiated}</Text>
            <Text
              className="text-[13px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
            >
              {formatOrderTimestamp(order.createdAt, timeZone)}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between px-1">
          <View className="flex-row items-center gap-1.5">
            <Receipt color="#0058bc" size={20} />
            <Text
              className="text-[18px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {PAYIN_COPY.customerReceipt}
            </Text>
          </View>
          {ocrText ? (
            <View className="flex-row items-center gap-1 rounded-full bg-[#57fdc8] px-2.5 py-0.5">
              <Text
                className="text-[11px] text-[#007256]"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {ocrText}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="rounded-xl bg-white p-4 shadow-sm">
          {receipt ? (
            <View className="rounded-xl bg-[#f0f3ff] p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#006c51]">
                  <Check color="#ffffff" size={22} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[14px] text-[#0d1c32]"
                    style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                  >
                    {receipt.statusLabel ?? PAYIN_COPY.customerReceipt}
                  </Text>
                  {payeeLine ? (
                    <Text className="text-[11px] text-[#414754]" numberOfLines={1}>
                      {payeeLine}
                    </Text>
                  ) : null}
                </View>
              </View>
              {receiptAmount ? (
                <Text
                  className="mt-4 text-[24px] text-[#0d1c32]"
                  style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
                >
                  {receiptAmount}
                </Text>
              ) : null}
              {receipt.settlementLabel ? (
                <Text
                  className="mt-1 text-[11px] text-[#006c51]"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {receipt.settlementLabel}
                </Text>
              ) : null}
              <View className="mt-4 gap-2 rounded-lg bg-white/80 p-3">
                <ReceiptRow label={PAYIN_COPY.upiRef} value={receipt.upiRef} emphasize />
                <ReceiptRow label={PAYIN_COPY.fromAccount} value={receipt.fromAccount} />
                <ReceiptRow
                  label={PAYIN_COPY.timestamp}
                  value={
                    receipt.timestamp ? formatOrderTimestamp(receipt.timestamp, timeZone) : null
                  }
                />
              </View>
            </View>
          ) : (
            <Text className="text-[13px] text-[#414754]">{PAYIN_COPY.noReceipt}</Text>
          )}

          <View className="mt-4 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-[#e8eeff] py-2.5"
              disabled={!canZoom}
              onPress={onZoom}
            >
              <ZoomIn color="#0d1c32" size={18} />
              <Text
                className="text-[12px] text-[#0d1c32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {PAYIN_COPY.zoomImage}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-[#e8eeff] py-2.5"
              disabled={slipBusy}
              onPress={onDownload}
            >
              <Download color="#0d1c32" size={18} />
              <Text
                className="text-[12px] text-[#0d1c32]"
                style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
              >
                {PAYIN_COPY.downloadSlip}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="gap-2 rounded-xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text
            className="text-[14px] text-[#0d1c32]"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {PAYIN_COPY.ledgerAudit}
          </Text>
          <Text
            className="text-[11px] text-[#414754]"
            style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
          >
            {verified} of {totalChecks} Verified
          </Text>
        </View>
        {order.verificationChecks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
        {Platform.OS === 'android' && smsChoice === 'unknown' ? (
          <Pressable onPress={onEnableSms}>
            <Text className="text-[13px] text-[#0058bc]">{PAYIN_COPY.smsListening}</Text>
          </Pressable>
        ) : null}
        {Platform.OS === 'android' && smsChoice === 'enabled' ? (
          <Text className="text-[12px] text-[#414754]">
            {SmsPaymentVerificationService.getStatus().mode === 'listening'
              ? PAYIN_COPY.smsListening
              : PAYIN_COPY.smsManual}
          </Text>
        ) : null}
        {Platform.OS === 'ios' ? (
          <Text className="text-[12px] text-[#414754]">{PAYIN_COPY.smsUnsupported}</Text>
        ) : null}
      </View>

      {order.collateral ? (
        <View className="mb-2 flex-row items-start gap-2 rounded-xl bg-[#f0f3ff] p-4">
          <Lock color="#0058bc" size={22} />
          <View className="min-w-0 flex-1">
            <Text
              className="text-[12px] text-[#0d1c32]"
              style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
            >
              {PAYIN_COPY.escrow}
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-[#414754]">
              {order.collateral.message ??
                `${formatMoneyMinor(order.collateral.amountMinor, order.collateral.currency)} · ${order.collateral.status}`}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-start justify-between gap-3">
      <Text className="text-[12px] text-[#414754]">{label}</Text>
      <Text
        className="max-w-[65%] text-right text-[13px] text-[#0d1c32]"
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}

function TimelineRow({
  event,
  timeZone,
}: {
  event: PayinTimelineEvent;
  timeZone?: string | null;
}) {
  return (
    <View className="mb-2 flex-row items-start gap-2">
      <View className="mt-1.5 h-2 w-2 rounded-full bg-[#0058bc]" />
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] text-[#0d1c32]"
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {event.label}
        </Text>
        {event.at ? (
          <Text className="text-[11px] text-[#414754]">{formatOrderTimestamp(event.at, timeZone)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ReceiptRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string | null;
  emphasize?: boolean;
}) {
  if (!value) return null;
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[11px] text-[#414754]">{label}</Text>
      <Text
        className={`flex-1 text-right text-[12px] ${emphasize ? 'text-[#0058bc]' : 'text-[#0d1c32]'}`}
        style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
      >
        {value}
      </Text>
    </View>
  );
}

function CheckRow({ check }: { check: VerificationCheck }) {
  const verified = check.status === 'VERIFIED';
  const failed = check.status === 'FAILED';
  return (
    <View
      className={`flex-row items-center gap-2 rounded-lg p-2.5 ${
        verified ? 'bg-[#f0f3ff]' : 'bg-[#dfe8ff]'
      }`}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-full ${
          verified ? 'bg-[#57fdc8]' : failed ? 'bg-[#ffdad6]' : 'bg-[#0070eb]'
        }`}
      >
        {verified ? (
          <Check color="#007256" size={14} />
        ) : (
          <Hourglass color={failed ? '#93000a' : '#fefcff'} size={14} />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[13px] text-[#0d1c32]">{check.title}</Text>
        {check.details ? <Text className="text-[12px] text-[#414754]">{check.details}</Text> : null}
      </View>
    </View>
  );
}

function ocrLabel(order: PayinOrderDetail): string | null {
  if (order.ocrStatus === 'NO_RECEIPT') return null;
  if (order.ocrStatus === 'VERIFIED' && order.ocrConfidence != null) {
    return `OCR Verified ${order.ocrConfidence.toFixed(1)}%`;
  }
  return OCR_LABEL[order.ocrStatus];
}

function moneyParts(amountMinor: number, currency: string): { symbol: string; value: string } {
  const formatted = formatMoneyMinor(amountMinor, currency);
  if (formatted.startsWith('₹')) return { symbol: '₹', value: formatted.slice(1) };
  if (formatted.startsWith('-₹')) return { symbol: '-₹', value: formatted.slice(2) };
  return { symbol: '', value: formatted };
}

function displayPhone(phone: string): string {
  if (/[•*]/.test(phone)) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}
