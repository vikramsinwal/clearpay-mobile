import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef } from 'react';

import { loginCustomer } from '@/features/auth/api/login';
import {
  createLoginLock,
  runLoginAttempt,
} from '@/features/auth/lib/login-session';
import { getSignInErrorMessage } from '@/features/auth/lib/sign-in-errors';
import type { SignInFormValues } from '@/features/auth/schemas/sign-in-schema';
import { clearAuthTokens, saveAuthTokens } from '@/lib/auth/secure-tokens';
import { useAuthStore } from '@/stores/auth-store';

type UseSignInOptions = {
  onFormError?: (message: string) => void;
  onSuccessClearForm?: () => void;
};

export function useSignIn(options: UseSignInOptions = {}) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const lockRef = useRef(createLoginLock());

  const mutation = useMutation({
    mutationKey: ['auth', 'login'],
    retry: false,
    networkMode: 'always',
    mutationFn: (values: SignInFormValues) =>
      runLoginAttempt(
        {
          email: values.email,
          password: values.password,
        },
        {
          login: loginCustomer,
          saveTokens: saveAuthTokens,
          clearTokens: clearAuthTokens,
        },
        {
          setSession,
          clearSession,
          navigateToDashboard: () => {
            options.onSuccessClearForm?.();
            router.replace('/');
          },
        },
      ),
    onError: (error) => {
      options.onFormError?.(getSignInErrorMessage(error));
    },
  });

  const mutate: typeof mutation.mutate = (values, mutateOptions) => {
    if (!lockRef.current.tryAcquire()) {
      return;
    }
    try {
      mutation.mutate(values, {
        ...mutateOptions,
        onSettled: (...args) => {
          lockRef.current.release();
          mutateOptions?.onSettled?.(...args);
        },
      });
    } catch (error) {
      lockRef.current.release();
      throw error;
    }
  };

  return { ...mutation, mutate };
}
