import { ACCOUNTS_COPY } from '@/constants/accounts';
import { accountProvidersFor } from '@/features/accounts/lib/providers';
import type { AccountFormField, AccountKind } from '@/features/accounts/types';

const LIMIT_FIELD: AccountFormField = {
  key: 'transactionLimit',
  label: ACCOUNTS_COPY.limitPaise,
  required: false,
  type: 'number',
  placeholder: 'Optional, in paise',
  section: 'additional',
  options: [],
};

export function accountFormFields(kind: AccountKind): AccountFormField[] {
  const provider: AccountFormField = {
    key: 'provider',
    label: ACCOUNTS_COPY.provider,
    required: true,
    type: 'select',
    placeholder: 'Select',
    section: 'basic',
    options: accountProvidersFor(kind).map((item) => ({
      value: item.id,
      label: item.label,
    })),
  };
  const name: AccountFormField = {
    key: 'name',
    label: 'Name',
    required: true,
    type: 'text',
    placeholder: 'Shop name',
    section: 'basic',
    options: [],
  };

  if (kind === 'gateway') {
    return [
      name,
      provider,
      {
        key: 'merchantId',
        label: ACCOUNTS_COPY.merchantId,
        required: true,
        type: 'text',
        placeholder: 'Merchant ID',
        section: 'basic',
        options: [],
      },
      {
        key: 'displayName',
        label: ACCOUNTS_COPY.displayName,
        required: false,
        type: 'text',
        placeholder: 'Shown in Clearpay',
        section: 'additional',
        options: [],
      },
      LIMIT_FIELD,
    ];
  }

  return [
    name,
    provider,
    {
      key: 'upiId',
      label: ACCOUNTS_COPY.upiId,
      required: true,
      type: 'text',
      placeholder: 'username@bank',
      section: 'basic',
      options: [],
    },
    {
      key: 'phone',
      label: ACCOUNTS_COPY.phone,
      required: false,
      type: 'tel',
      placeholder: '+919876543210',
      section: 'basic',
      options: [],
    },
    {
      key: 'accountHolderName',
      label: ACCOUNTS_COPY.accountHolder,
      required: false,
      type: 'text',
      placeholder: 'Name on the account',
      section: 'additional',
      options: [],
    },
    {
      key: 'accountNumber',
      label: ACCOUNTS_COPY.accountNumber,
      required: false,
      type: 'number',
      placeholder: '9–18 digits',
      section: 'additional',
      options: [],
    },
    {
      key: 'ifsc',
      label: ACCOUNTS_COPY.ifsc,
      required: false,
      type: 'text',
      placeholder: 'HDFC0001234',
      section: 'additional',
      options: [],
    },
    {
      key: 'bankName',
      label: ACCOUNTS_COPY.bankName,
      required: false,
      type: 'text',
      placeholder: 'Bank name',
      section: 'additional',
      options: [],
    },
    LIMIT_FIELD,
  ];
}
