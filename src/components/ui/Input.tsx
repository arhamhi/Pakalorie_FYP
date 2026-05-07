import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}) => {
  const { colors, accent, theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? colors.surface.tertiary : colors.surface.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: error || isFocused ? 2 : (theme === 'light' ? 1 : 2),
    borderColor: error
      ? '#D32F2F'
      : isFocused
      ? accent
      : theme === 'light'
      ? colors.border
      : 'transparent',
  };

  const inputStyle: TextStyle = {
    flex: 1,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 16,
    color: colors.text.primary,
  };

  const labelStyle: TextStyle = {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  };

  const hintStyle: TextStyle = {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: error ? '#D32F2F' : colors.text.tertiary,
    marginTop: 6,
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={labelStyle}>{label}</Text>}
      <View style={inputContainerStyle}>
        {leftIcon && <View style={{ marginRight: 12 }}>{leftIcon}</View>}
        <TextInput
          style={[inputStyle, style]}
          placeholderTextColor={colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && <View style={{ marginLeft: 12 }}>{rightIcon}</View>}
      </View>
      {(error || hint) && <Text style={hintStyle}>{error || hint}</Text>}
    </View>
  );
};
