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
  SegmentedButtons,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { Invoice, Client, RootStackParamList, InvoiceItem } from '../../types';
import colors from '../../theme/colors';

type InvoiceFormScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'InvoiceForm'>;
  route: RouteProp<RootStackParamList, 'InvoiceForm'>;
};

interface FormItem {
  description: string;
  hsn_sac: string;
  gst_rate: string;
  taxable_amount: string;
  total_amount: string;
}

export default function InvoiceFormScreen({
  navigation,
  route,
}: InvoiceFormScreenProps) {
  const invoiceId = route.params?.invoiceId;
  const isEditing = !!invoiceId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientMenuVisible, setClientMenuVisible] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState<FormItem[]>([
    { description: '', hsn_sac: '', gst_rate: '18', taxable_amount: '', total_amount: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchClients();
    if (isEditing) {
      fetchInvoice();
    }
  }, []);

  const fetchClients = async () => {
    try {
      const data = await api.getClients({ page: 1 });
      setClients(data.results || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const data = await api.getInvoice(invoiceId!);
      setInvoiceType(data.invoice_type);
      setInvoiceDate(data.invoice_date);
      setNotes(data.notes || '');

      // Find and set client
      const client = clients.find((c) => c.id === data.client);
      setSelectedClient(client || null);

      // Set items
      if (data.items && data.items.length > 0) {
        setItems(
          data.items.map((item) => ({
            description: item.description,
            hsn_sac: item.hsn_sac,
            gst_rate: item.gst_rate,
            taxable_amount: item.taxable_amount,
            total_amount: item.total_amount,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total if taxable_amount or gst_rate changes
    if (field === 'taxable_amount' || field === 'gst_rate') {
      const taxable = parseFloat(newItems[index].taxable_amount) || 0;
      const gstRate = parseFloat(newItems[index].gst_rate) || 0;
      const gstAmount = (taxable * gstRate) / 100;
      newItems[index].total_amount = (taxable + gstAmount).toFixed(2);
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      { description: '', hsn_sac: '', gst_rate: '18', taxable_amount: '', total_amount: '' },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const taxable = parseFloat(item.taxable_amount) || 0;
      const total = parseFloat(item.total_amount) || 0;
      subtotal += taxable;
      taxAmount += total - taxable;
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  const handleSave = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    const validItems = items.filter(
      (item) => item.description && parseFloat(item.taxable_amount) > 0
    );

    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setSaving(true);

    try {
      const invoiceData = {
        client: selectedClient.id,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        notes,
        items: validItems.map((item) => ({
          description: item.description,
          hsn_sac: item.hsn_sac,
          gst_rate: item.gst_rate,
          taxable_amount: item.taxable_amount,
          total_amount: item.total_amount,
        })),
      };

      if (isEditing) {
        await api.updateInvoice(invoiceId!, invoiceData);
      } else {
        await api.createInvoice(invoiceData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save invoice'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Invoice Type */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Invoice Type
            </Text>
            <SegmentedButtons
              value={invoiceType}
              onValueChange={(value) => setInvoiceType(value as 'tax' | 'proforma')}
              buttons={[
                { value: 'tax', label: 'Tax Invoice' },
                { value: 'proforma', label: 'Proforma' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Client Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Client
            </Text>
            <Menu
              visible={clientMenuVisible}
              onDismiss={() => setClientMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setClientMenuVisible(true)}
                  style={styles.clientButton}
                >
                  {selectedClient?.name || 'Select Client'}
                </Button>
              }
            >
              {clients && clients.length > 0 ? (
                clients.map((client) => (
                  <Menu.Item
                    key={client.id}
                    onPress={() => {
                      setSelectedClient(client);
                      setClientMenuVisible(false);
                    }}
                    title={client.name}
                  />
                ))
              ) : (
                <Menu.Item title="No clients available" disabled />
              )}
            </Menu>
          </Card.Content>
        </Card>

        {/* Date */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Invoice Date
            </Text>
            <TextInput
              mode="outlined"
              value={invoiceDate}
              onChangeText={setInvoiceDate}
              placeholder="YYYY-MM-DD"
            />
          </Card.Content>
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.itemsHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Items
              </Text>
              <Button mode="text" onPress={addItem} compact>
                Add Item
              </Button>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text variant="labelLarge">Item {index + 1}</Text>
                  {items.length > 1 && (
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => removeItem(index)}
                    />
                  )}
                </View>

                <TextInput
                  mode="outlined"
                  label="Description"
                  value={item.description}
                  onChangeText={(value) => updateItem(index, 'description', value)}
                  style={styles.input}
                />

                <View style={styles.row}>
                  <TextInput
                    mode="outlined"
                    label="HSN/SAC"
                    value={item.hsn_sac}
                    onChangeText={(value) => updateItem(index, 'hsn_sac', value)}
                    style={[styles.input, styles.halfInput]}
                  />
                  <TextInput
                    mode="outlined"
                    label="GST %"
                    value={item.gst_rate}
                    onChangeText={(value) => updateItem(index, 'gst_rate', value)}
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>

                <View style={styles.row}>
                  <TextInput
                    mode="outlined"
                    label="Taxable Amount"
                    value={item.taxable_amount}
                    onChangeText={(value) => updateItem(index, 'taxable_amount', value)}
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                  <TextInput
                    mode="outlined"
                    label="Total Amount"
                    value={item.total_amount}
                    onChangeText={(value) => updateItem(index, 'total_amount', value)}
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>

                {index < items.length - 1 && <Divider style={styles.itemDivider} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Subtotal</Text>
              <Text variant="bodyLarge">{formatCurrency(totals.subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Tax Amount</Text>
              <Text variant="bodyLarge">{formatCurrency(totals.taxAmount)}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total
              </Text>
              <Text variant="headlineSmall" style={styles.grandTotal}>
                {formatCurrency(totals.total)}
              </Text>
            </View>
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

      {/* Save Button */}
      <View style={styles.actions}>
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
          style={styles.actionButton}
        >
          {isEditing ? 'Update' : 'Create'} Invoice
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
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  clientButton: {
    justifyContent: 'flex-start',
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemContainer: {
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDivider: {
    marginTop: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  totalLabel: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  grandTotal: {
    fontWeight: 'bold',
    color: colors.primary[500],
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
});
