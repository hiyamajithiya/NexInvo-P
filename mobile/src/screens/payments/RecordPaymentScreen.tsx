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
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { Invoice, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type RecordPaymentScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RecordPayment'>;
  route: RouteProp<RootStackParamList, 'RecordPayment'>;
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
];

export default function RecordPaymentScreen({
  navigation,
  route,
}: RecordPaymentScreenProps) {
  const insets = useSafeAreaInsets();
  const preselectedInvoiceId = route.params?.invoiceId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceMenuVisible, setInvoiceMenuVisible] = useState(false);

  // Form state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState('');
  const [tdsAmount, setTdsAmount] = useState('');
  const [gstTdsAmount, setGstTdsAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchUnpaidInvoices();
  }, []);

  const fetchUnpaidInvoices = async () => {
    try {
      const data = await api.getUnpaidInvoices();
      setInvoices(data.results || []);

      // If preselected invoice, find and set it
      if (preselectedInvoiceId) {
        const invoice = (data.results || []).find(
          (inv) => inv.id === preselectedInvoiceId
        );
        if (invoice) {
          setSelectedInvoice(invoice);
          setAmount(invoice.total_amount);
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setAmount(invoice.total_amount);
    setInvoiceMenuVisible(false);
  };

  const calculateAmountReceived = () => {
    const paymentAmount = parseFloat(amount) || 0;
    const tds = parseFloat(tdsAmount) || 0;
    const gstTds = parseFloat(gstTdsAmount) || 0;
    return (paymentAmount - tds - gstTds).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedInvoice) {
      Alert.alert('Error', 'Please select an invoice');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);

    try {
      const paymentData = {
        invoice: selectedInvoice.id,
        amount: amount,
        tds_amount: tdsAmount || '0',
        gst_tds_amount: gstTdsAmount || '0',
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: notes,
      };

      await api.createPayment(paymentData);
      Alert.alert('Success', 'Payment recorded successfully. Receipt has been generated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to record payment'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num || 0);
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
        {/* Invoice Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Select Invoice
            </Text>
            <Menu
              visible={invoiceMenuVisible}
              onDismiss={() => setInvoiceMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setInvoiceMenuVisible(true)}
                  style={styles.selectButton}
                  contentStyle={styles.selectButtonContent}
                >
                  {selectedInvoice
                    ? `${selectedInvoice.invoice_number} - ${selectedInvoice.client_name}`
                    : 'Select Invoice'}
                </Button>
              }
            >
              {invoices && invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <Menu.Item
                    key={invoice.id}
                    onPress={() => handleInvoiceSelect(invoice)}
                    title={`${invoice.invoice_number} - ${invoice.client_name} (${formatCurrency(invoice.total_amount)})`}
                  />
                ))
              ) : (
                <Menu.Item title="No unpaid invoices" disabled />
              )}
            </Menu>

            {selectedInvoice && (
              <View style={styles.invoiceDetails}>
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Invoice Amount:
                  </Text>
                  <Text variant="bodyLarge" style={styles.detailValue}>
                    {formatCurrency(selectedInvoice.total_amount)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Status:
                  </Text>
                  <Text variant="bodyMedium" style={styles.statusText}>
                    {selectedInvoice.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Payment Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Details
            </Text>

            <TextInput
              mode="outlined"
              label="Amount *"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Affix text="₹" />}
            />

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="TDS Amount"
                value={tdsAmount}
                onChangeText={setTdsAmount}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Affix text="₹" />}
              />
              <TextInput
                mode="outlined"
                label="GST TDS"
                value={gstTdsAmount}
                onChangeText={setGstTdsAmount}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                left={<TextInput.Affix text="₹" />}
              />
            </View>

            <View style={styles.amountReceived}>
              <Text variant="bodyMedium" style={styles.detailLabel}>
                Amount to be Received:
              </Text>
              <Text variant="titleLarge" style={styles.receivedAmount}>
                {formatCurrency(calculateAmountReceived())}
              </Text>
            </View>

            <TextInput
              mode="outlined"
              label="Payment Date *"
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Payment Method */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Method
            </Text>
            <SegmentedButtons
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              buttons={paymentMethods}
              style={styles.segmentedButtons}
            />

            <TextInput
              mode="outlined"
              label="Reference Number"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Transaction ID / Cheque No."
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notes (Optional)
            </Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
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
          disabled={saving || !selectedInvoice}
          style={[styles.actionButton, styles.saveButton]}
        >
          Record Payment
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
    marginBottom: 12,
    color: colors.text.primary,
  },
  selectButton: {
    justifyContent: 'flex-start',
    borderColor: colors.primary[500],
  },
  selectButtonContent: {
    justifyContent: 'flex-start',
  },
  invoiceDetails: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    color: colors.text.secondary,
  },
  detailValue: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusText: {
    color: colors.primary[500],
    fontWeight: '600',
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
  amountReceived: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.success.light,
    borderRadius: 8,
    marginBottom: 12,
  },
  receivedAmount: {
    fontWeight: 'bold',
    color: colors.success.main,
  },
  segmentedButtons: {
    marginBottom: 12,
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
