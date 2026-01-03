import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  Switch,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type EmailSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailSettings'>;
};

export default function EmailSettingsScreen({ navigation }: EmailSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [emailSignature, setEmailSignature] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getEmailSettings();
      setSmtpHost(data.smtp_host || '');
      setSmtpPort(data.smtp_port?.toString() || '587');
      setSmtpUsername(data.smtp_username || '');
      setFromEmail(data.from_email || '');
      setFromName(data.from_name || '');
      setUseTls(data.use_tls !== false);
      setEmailSignature(data.email_signature || '');
      // Don't populate password from server for security
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      // Don't show error if settings don't exist yet
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load email settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!smtpHost.trim()) {
      Alert.alert('Error', 'SMTP Host is required');
      return;
    }
    if (!smtpUsername.trim()) {
      Alert.alert('Error', 'SMTP Username is required');
      return;
    }
    if (!fromEmail.trim()) {
      Alert.alert('Error', 'From Email is required');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort) || 587,
        smtp_username: smtpUsername.trim(),
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        use_tls: useTls,
        email_signature: emailSignature.trim(),
      };

      // Only include password if it's been changed
      if (smtpPassword) {
        payload.smtp_password = smtpPassword;
      }

      await api.updateEmailSettings(payload);
      Alert.alert('Success', 'Email settings saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save email settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const response = await api.testEmailSettings();
      Alert.alert('Success', response.message || 'Test email sent successfully!');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send test email. Please check your settings.'
      );
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.infoTitle}>
              Email Configuration
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              Configure SMTP settings to send invoices directly to clients via email.
            </Text>
          </Card.Content>
        </Card>

        {/* Gmail Instructions */}
        <Card style={[styles.card, styles.instructionsCard]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.instructionsTitle}>
              For Gmail Users:
            </Text>
            <Text variant="bodySmall" style={styles.instructionsText}>
              {'\u2022'} SMTP Host: smtp.gmail.com{'\n'}
              {'\u2022'} SMTP Port: 587 (TLS) or 465 (SSL){'\n'}
              {'\u2022'} Enable 2-Step Verification in your Google Account{'\n'}
              {'\u2022'} Create an App Password and use it here
            </Text>
          </Card.Content>
        </Card>

        {/* SMTP Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              SMTP Settings
            </Text>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="SMTP Host *"
                value={smtpHost}
                onChangeText={setSmtpHost}
                style={[styles.input, styles.flexInput]}
                placeholder="smtp.gmail.com"
              />

              <TextInput
                mode="outlined"
                label="Port *"
                value={smtpPort}
                onChangeText={setSmtpPort}
                keyboardType="numeric"
                style={[styles.input, styles.portInput]}
                placeholder="587"
              />
            </View>

            <TextInput
              mode="outlined"
              label="SMTP Username *"
              value={smtpUsername}
              onChangeText={setSmtpUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="your-email@example.com"
            />

            <TextInput
              mode="outlined"
              label="SMTP Password *"
              value={smtpPassword}
              onChangeText={setSmtpPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              placeholder="App Password or SMTP Password"
            />
            <Text variant="bodySmall" style={styles.hint}>
              Leave blank to keep current password
            </Text>

            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Use TLS/SSL</Text>
              <Switch
                value={useTls}
                onValueChange={setUseTls}
                color={colors.primary[500]}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Sender Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sender Information
            </Text>

            <TextInput
              mode="outlined"
              label="From Email *"
              value={fromEmail}
              onChangeText={setFromEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="noreply@company.com"
            />

            <TextInput
              mode="outlined"
              label="From Name"
              value={fromName}
              onChangeText={setFromName}
              style={styles.input}
              placeholder="Your Company Name"
            />

            <TextInput
              mode="outlined"
              label="Email Signature"
              value={emailSignature}
              onChangeText={setEmailSignature}
              multiline
              numberOfLines={4}
              style={styles.input}
              placeholder="Enter your default email signature..."
            />
          </Card.Content>
        </Card>

        {/* Test Email Button */}
        <Button
          mode="outlined"
          onPress={handleTestEmail}
          loading={testing}
          disabled={testing || saving}
          icon="email-send"
          style={styles.testButton}
        >
          Send Test Email
        </Button>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || testing}
          style={[styles.actionButton, styles.saveButton]}
        >
          Save Settings
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  infoCard: {
    backgroundColor: colors.primary[50],
  },
  infoTitle: {
    color: colors.primary[700],
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: colors.primary[600],
  },
  instructionsCard: {
    backgroundColor: '#eff6ff',
  },
  instructionsTitle: {
    color: '#1e40af',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#1e3a8a',
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.background.paper,
  },
  hint: {
    color: colors.text.secondary,
    marginTop: -8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexInput: {
    flex: 1,
  },
  portInput: {
    width: 100,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  testButton: {
    marginBottom: 16,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background.paper,
    elevation: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
  },
});
