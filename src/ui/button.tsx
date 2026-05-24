import { Pressable, Text } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: 'bg-brand-300',
  secondary: 'bg-brand-200',
  outline: 'border-2 border-brand-300 bg-white',
  ghost: 'bg-brand-100',
};

const textVariants = {
  primary: 'text-white',
  secondary: 'text-brand-navy',
  outline: 'text-brand-300',
  ghost: 'text-brand-navy',
};

export function Button({ label, onPress, variant = 'primary', disabled = false, className = '' }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3.5 ${variants[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <Text className={`text-center text-sm font-bold ${textVariants[variant]}`}>{label}</Text>
    </Pressable>
  );
}
