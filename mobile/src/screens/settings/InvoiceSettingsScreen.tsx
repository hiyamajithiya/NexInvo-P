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
import { InvoiceSettings, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type InvoiceSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'InvoiceSettings'>;
};

export default function InvoiceSettingsScreen({ navigation }: InvoiceSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);

  // Form state
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [startingNumber, setStartingNumber] = useState('');
  const [proformaPrefix, setProformaPrefix] = useState('');
  const [proformaStartingNumber, setProformaStartingNumber] = useState('');
  const [receiptPrefix, setReceiptPrefix] = useState('');
  const [receiptStartingNumber, setReceiptStartingNumber] = useState('');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [defaultGstRate, setDefaultGstRate] = useState('');
  const [paymentDueDays, setPaymentDueDays] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [enablePaymentReminders, setEnablePaymentReminders] = useState(false);
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getInvoiceSettings();
      setSettings(data);
      setInvoicePrefix(data.invoicePrefix || '');
      setStartingNumber(data.startingNumber?.toString() || '');
      setProformaPrefix(data.proformaPrefix || '');
      setProformaStartingNumber(data.proformaStartingNumber?.toString() || '');
      setReceiptPrefix(data.receiptPrefix || '');
      setReceiptStartingNumber(data.receiptStartingNumber?.toString() || '');
      setGstEnabled(data.gstEnabled ?? true);
      setDefaultGstRate(data.defaultGstRate || '');
      setPaymentDueDays(data.paymentDueDays?.toString() || '');
      setTermsAndConditions(data.termsAndConditions || '');
      setNotes(data.notes || '');
      setEnablePaymentReminders(data.enablePaymentReminders ?? false);
      setReminderFrequencyDays(data.reminderFrequencyDays?.toString() || '');
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
      Alert.alert('Error', 'Failed to load invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateInvoiceSettings({
        invoicePrefix: invoicePrefix.trim(),
        startingNumber: parseInt(startingNumber) || undefined,
        proformaPrefix: proformaPrefix.trim(),
        proformaStartingNumber: parseInt(proformaStartingNumber) || undefined,
        receiptPrefix: receiptPrefix.trim(),
        receiptStartingNumber: parseInt(receiptStartingNumber) || undefined,
        gstEnabled,
        defaultGstRate: defaultGstRate.trim(),
        paymentDueDays: parseInt(paymentDueDays) || undefined,
        termsAndConditions: termsAndConditions.trim(),
        notes: notes.trim(),
        enablePaymentReminders,
        reminderFrequencyDays: parseInt(reminderFrequencyDays) || undefined,
      });
      Alert.alert('Success', 'Invoice settings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error updating invoice settings:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update invoice settings'
      );
    } finally {
      setSaving(false);
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
        {/* Invoice Numbering */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Invoice Numbering
            </Text>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Invoice Prefix"
                value={invoicePrefix}
                onChangeText={setInvoicePrefix}
                style={[styles.input, styles.halfInput]}
              />

              <TextInput
                mode="outlined"
                label="Starting Number"
                value={startingNumber}
                onChangeText={setStartingNumber}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Proforma Prefix"
                value={proformaPrefix}
                onChangeText={setProformaPrefix}
                style={[styles.input, styles.halfInput]}
              />

              <TextInput
                mode="outlined"
                label="Starting Number"
                value={proformaStartingNumber}
                onChangeText={setProformaStartingNumber}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Receipt Prefix"
                value={receiptPrefix}
                onChangeText={setReceiptPrefix}
                style={[styles.input, styles.halfInput]}
              />

              <TextInput
                mode="outlined"
                label="Starting Number"
                value={receiptStartingNumber}
                onChangeText={setReceiptStartingNumber}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
              />
            </View>
          </Card.Content>
        </Card>

        {/* GST Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              GST Settings
            </Text>

            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Enable GST</Text>
              <Switch
                value={gstEnabled}
                onValueChange={setGstEnabled}
                color={colors.primary[500]}
              />
            </View>

            <TextInput
              mode="outlined"
              label="Default GST Rate (%)"
              value={defaultGstRate}
              onChangeText={setDefaultGstRate}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Payment Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Settings
            </Text>

            <TextInput
              mode="outlined"
              label="Payment Due Days"
              value={paymentDueDays}
              onChangeText={setPaymentDueDays}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Enable Payment Reminders</Text>
              <Switch
                value={enablePaymentReminders}
                onValueChange={setEnablePaymentReminders}
                color={colors.primary[500]}
              />
            </View>

            {enablePaymentReminders && (
              <TextInput
                mode="outlined"
                label="Reminder Frequency (Days)"
                value={reminderFrequencyDays}
                onChangeText={setReminderFrequencyDays}
                keyboardType="numeric"
                style={styles.input}
              />
            )}
          </Card.Content>
        </Card>

        {/* Default Content */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Default Content
            </Text>

            <TextInput
              mode="outlined"
              label="Terms & Conditions"
              value={termsAndConditions}
              onChangeText={setTermsAndConditions}
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Card.Content>
        </Card>
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
          disabled={saving}
          style={[styles.actionButton, styles.saveButton]}
        >
          Save Changes
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
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.background.paper,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
