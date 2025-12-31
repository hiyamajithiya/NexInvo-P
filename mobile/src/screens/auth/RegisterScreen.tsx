import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  ProgressBar,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import colors from '../../theme/colors';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Email
  const [email, setEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState('');

  // Step 3: Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.sendOtp({ email: email.trim() });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.verifyOtp({ email: email.trim(), otp: otp.trim() });
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !organizationName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.register({
        email: email.trim(),
        otp: otp.trim(),
        username: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization_name: organizationName.trim(),
        phone: phone.trim(),
      });

      // Show success and navigate to login
      navigation.replace('Login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Enter Your Email
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              We'll send you a verification code
            </Text>

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />

            <Button
              mode="contained"
              onPress={handleSendOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Send OTP
            </Button>
          </>
        );

      case 2:
        return (
          <>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Verify OTP
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              Enter the 6-digit code sent to {email}
            </Text>

            <TextInput
              label="OTP Code"
              value={otp}
              onChangeText={setOtp}
              mode="outlined"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              left={<TextInput.Icon icon="numeric" />}
            />

            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Verify OTP
            </Button>

            <Button
              mode="text"
              onPress={handleSendOtp}
              disabled={loading}
              style={styles.resendButton}
            >
              Resend OTP
            </Button>
          </>
        );

      case 3:
        return (
          <>
            <Text variant="headlineSmall" style={styles.stepTitle}>
              Complete Registration
            </Text>
            <Text variant="bodyMedium" style={styles.stepSubtitle}>
              Enter your details to create an account
            </Text>

            <View style={styles.row}>
              <TextInput
                label="First Name *"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                label="Last Name *"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <TextInput
              label="Organization Name *"
              value={organizationName}
              onChangeText={setOrganizationName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="domain" />}
            />

            <TextInput
              label="Phone (Optional)"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />

            <TextInput
              label="Password *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TextInput
              label="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              left={<TextInput.Icon icon="lock-check" />}
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Create Account
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            NexInvo
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Create Your Account
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar progress={step / 3} style={styles.progress} />
          <Text variant="bodySmall" style={styles.progressText}>
            Step {step} of 3
          </Text>
        </View>

        <View style={styles.form}>
          {renderStep()}

          {error ? (
            <HelperText type="error" visible={true} style={styles.error}>
              {error}
            </HelperText>
          ) : null}

          <View style={styles.footer}>
            <Text variant="bodyMedium">Already have an account? </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              compact
            >
              Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progress: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.text.secondary,
  },
  form: {
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text.primary,
  },
  stepSubtitle: {
    color: colors.text.secondary,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  error: {
    marginTop: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
