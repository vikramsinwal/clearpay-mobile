import { Text, View } from 'react-native';

type RegistrationProgressProps = {
  activeStep: 1 | 2;
};

/** Numbered two-step progress used by Create Account flow. */
export function RegistrationProgress({ activeStep }: RegistrationProgressProps) {
  return (
    <View className="mt-5 flex-row items-center">
      <Step
        index={1}
        label="Your details"
        state={activeStep === 1 ? 'active' : 'complete'}
      />
      <View className="mx-2 h-[2px] flex-1 rounded-full bg-slate-200" />
      <Step
        index={2}
        label="Telegram"
        state={activeStep === 2 ? 'active' : 'inactive'}
      />
    </View>
  );
}

type StepState = 'active' | 'complete' | 'inactive';

function Step({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: StepState;
}) {
  const circleClass =
    state === 'active'
      ? 'bg-blue'
      : state === 'complete'
        ? 'bg-teal'
        : 'bg-slate-200';

  const labelClass = state === 'inactive' ? 'text-slate-400' : 'text-navy';

  return (
    <View className="min-w-[96px] flex-row items-center gap-2">
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${circleClass}`}
      >
        <Text
          className={`text-[12px] font-semibold ${
            state === 'inactive' ? 'text-slate-500' : 'text-white'
          }`}
          style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
        >
          {index}
        </Text>
      </View>
      <Text
        className={`text-[13px] font-medium ${labelClass}`}
        style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
      >
        {label}
      </Text>
    </View>
  );
}
