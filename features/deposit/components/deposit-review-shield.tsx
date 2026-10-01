import { RefreshCw } from 'lucide-react-native';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

/** Shield + clock emblem from the Deposit Under Review design. */
export function DepositReviewShield() {
  return (
    <View className="relative mb-4 h-20 w-20 items-center justify-center">
      <View className="absolute h-16 w-16 rounded-full bg-[#DFE8FF] opacity-40" />
      <LinearGradient
        colors={['#0058BC', '#006C51']}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 1 }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0058BC',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <Svg width={36} height={36} viewBox="0 0 48 48">
          <Path
            d="M24 4L10 10V22C10 31.2 16 39.7 24 44C32 39.7 38 31.2 38 22V10L24 4Z"
            fill="#FFFFFF"
            fillOpacity={0.15}
          />
          <Path
            d="M24 5.5L11.5 11V22C11.5 30.5 17 38.3 24 42.2C31 38.3 36.5 30.5 36.5 22V11L24 5.5Z"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
          <Circle
            cx={24}
            cy={23}
            r={7}
            fill="none"
            stroke="#FFFFFF"
            strokeDasharray="2 2"
            strokeWidth={2.2}
          />
          <Polyline
            fill="none"
            points="24,19.5 24,23.5 26.5,25.5"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
          />
        </Svg>
      </LinearGradient>
      <View className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full bg-[#57FDC8] shadow-sm">
        <RefreshCw color="#002116" size={12} strokeWidth={2.5} />
      </View>
    </View>
  );
}
