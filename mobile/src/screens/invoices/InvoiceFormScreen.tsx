import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  SegmentedButtons,
  IconButton,
  Divider,
  Searchbar,
  Portal,
  RadioButton,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { Client, RootStackParamList, ServiceItem, PaymentTerm } from '../../types';
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
  serviceId?: number;
}

export default function InvoiceFormScreen({
  navigation,
  route,
}: InvoiceFormScreenProps) {
  const insets = useSafeAreaInsets();
  const invoiceId = route.params?.invoiceId;
  const isEditing = !!invoiceId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);

  // Modal states
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [paymentTermModalVisible, setPaymentTermModalVisible] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState<PaymentTerm | null>(null);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState<FormItem[]>([
    { description: '', hsn_sac: '', gst_rate: '18', taxable_amount: '', total_amount: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Fetch all data in parallel
      const [clientsData, servicesData, paymentTermsData] = await Promise.all([
        api.getClients({ page: 1 }),
        api.getServiceItems({ page: 1 }),
        api.getPaymentTerms({ page: 1 }),
      ]);

      const clientsList = clientsData.results || [];
      const servicesList = servicesData.results || [];
      const paymentTermsList = paymentTermsData.results || [];

      setClients(clientsList);
      setServices(servicesList);
      setPaymentTerms(paymentTermsList);

      // If editing, fetch the invoice and set the selected values
      if (isEditing && invoiceId) {
        const invoiceData = await api.getInvoice(invoiceId);

        setInvoiceType(invoiceData.invoice_type);
        setInvoiceDate(invoiceData.invoice_date);
        setNotes(invoiceData.notes || '');

        // Find and set client from the fetched clients list
        const client = clientsList.find((c) => c.id === invoiceData.client);
        if (client) {
          setSelectedClient(client);
        }

        // Find and set payment term if exists
        if (invoiceData.payment_term) {
          const paymentTerm = paymentTermsList.find((pt) => pt.id === invoiceData.payment_term);
          if (paymentTerm) {
            setSelectedPaymentTerm(paymentTerm);
          }
        }

        // Set items
        if (invoiceData.items && invoiceData.items.length > 0) {
          setItems(
            invoiceData.items.map((item) => ({
              description: item.description,
              hsn_sac: item.hsn_sac,
              gst_rate: String(item.gst_rate),
              taxable_amount: String(item.taxable_amount),
              total_amount: String(item.total_amount),
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (isEditing) {
        Alert.alert('Error', 'Failed to load invoice');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const selectService = (service: ServiceItem, index: number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      description: service.name,
      hsn_sac: service.sac_code || '',
      gst_rate: String(service.gst_rate),
      serviceId: service.id,
    };

    // Recalculate total if taxable amount exists
    if (newItems[index].taxable_amount) {
      const taxable = parseFloat(newItems[index].taxable_amount) || 0;
      const gstRate = parseFloat(newItems[index].gst_rate) || 0;
      const gstAmount = (taxable * gstRate) / 100;
      newItems[index].total_amount = (taxable + gstAmount).toFixed(2);
    }

    setItems(newItems);
    setServiceModalVisible(false);
    setCurrentItemIndex(null);
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

    const totalBeforeRound = subtotal + taxAmount;
    const roundedTotal = Math.round(totalBeforeRound);
    const roundOff = roundedTotal - totalBeforeRound;

    return {
      subtotal,
      taxAmount,
      total: totalBeforeRound,
      roundOff,
      roundedTotal,
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
      const totals = calculateTotals();
      const invoiceData = {
        client: selectedClient.id,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        payment_term: selectedPaymentTerm?.id || null,
        notes,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        round_off: totals.roundOff,
        total_amount: totals.roundedTotal,
        items: validItems.map((item) => ({
          description: item.description || '',
          hsn_sac: item.hsn_sac || '',
          gst_rate: parseFloat(item.gst_rate) || 18,
          taxable_amount: parseFloat(item.taxable_amount) || 0,
          total_amount: parseFloat(item.total_amount) || 0,
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

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
              Client *
            </Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setClientModalVisible(true)}
            >
              <Text style={selectedClient ? styles.selectionText : styles.placeholderText}>
                {selectedClient?.name || 'Select Client'}
              </Text>
              <IconButton icon="chevron-down" size={20} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Date */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Invoice Date *
            </Text>
            <TextInput
              mode="outlined"
              value={invoiceDate}
              onChangeText={setInvoiceDate}
              placeholder="YYYY-MM-DD"
            />
          </Card.Content>
        </Card>

        {/* Payment Terms */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Terms
            </Text>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => setPaymentTermModalVisible(true)}
            >
              <Text style={selectedPaymentTerm ? styles.selectionText : styles.placeholderText}>
                {selectedPaymentTerm ? `${selectedPaymentTerm.term_name} (${selectedPaymentTerm.days} days)` : 'Select Payment Terms'}
              </Text>
              <IconButton icon="chevron-down" size={20} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Items */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.itemsHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Line Items *
              </Text>
              <Button mode="contained" onPress={addItem} compact style={styles.addButton}>
                + Add Item
              </Button>
            </View>

            {items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text variant="labelLarge" style={styles.itemLabel}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor={colors.error.main}
                      onPress={() => removeItem(index)}
                    />
                  )}
                </View>

                {/* Service Selection Button */}
                <TouchableOpacity
                  style={styles.serviceButton}
                  onPress={() => {
                    setCurrentItemIndex(index);
                    setServiceSearch('');
                    setServiceModalVisible(true);
                  }}
                >
                  <Text style={item.serviceId ? styles.selectionText : styles.placeholderText}>
                    {item.description || 'Select Service (or enter manually below)'}
                  </Text>
                  <IconButton icon="chevron-down" size={20} />
                </TouchableOpacity>

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
                    label="SAC Code"
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
                    label="Taxable Amount (₹)"
                    value={item.taxable_amount}
                    onChangeText={(value) => updateItem(index, 'taxable_amount', value)}
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                  <TextInput
                    mode="outlined"
                    label="Total Amount (₹)"
                    value={item.total_amount}
                    editable={false}
                    style={[styles.input, styles.halfInput, styles.readOnlyInput]}
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
              <Text variant="bodyMedium">GST Amount</Text>
              <Text variant="bodyLarge">{formatCurrency(totals.taxAmount)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Round Off</Text>
              <Text variant="bodyLarge" style={{ color: totals.roundOff >= 0 ? colors.success.main : colors.error.main }}>
                {totals.roundOff >= 0 ? '+' : ''}{formatCurrency(totals.roundOff)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total
              </Text>
              <Text variant="headlineSmall" style={styles.grandTotal}>
                {formatCurrency(totals.roundedTotal)}
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
          {isEditing ? 'Update' : 'Create'} Invoice
        </Button>
      </View>

      {/* Client Selection Modal */}
      <Portal>
        <Modal
          visible={clientModalVisible}
          onRequestClose={() => setClientModalVisible(false)}
          animationType="slide"
          transparent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Select Client</Text>
                <IconButton icon="close" onPress={() => setClientModalVisible(false)} />
              </View>

              <Searchbar
                placeholder="Search clients..."
                onChangeText={setClientSearch}
                value={clientSearch}
                style={styles.searchbar}
              />

              <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      selectedClient?.id === item.id && styles.selectedListItem
                    ]}
                    onPress={() => {
                      setSelectedClient(item);
                      setClientModalVisible(false);
                    }}
                  >
                    <View>
                      <Text variant="bodyLarge" style={styles.listItemTitle}>{item.name}</Text>
                      {item.email && (
                        <Text variant="bodySmall" style={styles.listItemSubtitle}>{item.email}</Text>
                      )}
                    </View>
                    {selectedClient?.id === item.id && (
                      <IconButton icon="check" iconColor={colors.primary[500]} size={20} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                      No clients found
                    </Text>
                    <Button
                      mode="contained"
                      onPress={() => {
                        setClientModalVisible(false);
                        navigation.navigate('ClientForm', {});
                      }}
                      style={styles.createButton}
                    >
                      + Create New Client
                    </Button>
                  </View>
                }
                style={styles.list}
              />

              <Button
                mode="outlined"
                onPress={() => {
                  setClientModalVisible(false);
                  navigation.navigate('ClientForm', {});
                }}
                style={styles.modalFooterButton}
              >
                + Create New Client
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Service Selection Modal */}
      <Portal>
        <Modal
          visible={serviceModalVisible}
          onRequestClose={() => setServiceModalVisible(false)}
          animationType="slide"
          transparent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Select Service</Text>
                <IconButton icon="close" onPress={() => setServiceModalVisible(false)} />
              </View>

              <Searchbar
                placeholder="Search services..."
                onChangeText={setServiceSearch}
                value={serviceSearch}
                style={styles.searchbar}
              />

              <FlatList
                data={filteredServices}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      if (currentItemIndex !== null) {
                        selectService(item, currentItemIndex);
                      }
                    }}
                  >
                    <View style={styles.serviceItemInfo}>
                      <Text variant="bodyLarge" style={styles.listItemTitle}>{item.name}</Text>
                      <View style={styles.serviceDetails}>
                        {item.sac_code && (
                          <Text variant="bodySmall" style={styles.serviceTag}>SAC: {item.sac_code}</Text>
                        )}
                        <Text variant="bodySmall" style={styles.serviceTag}>GST: {item.gst_rate}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                      No services found
                    </Text>
                    <Text variant="bodySmall" style={styles.emptySubtext}>
                      You can enter item details manually or create services in Settings → Service Master
                    </Text>
                  </View>
                }
                style={styles.list}
              />

              <Button
                mode="outlined"
                onPress={() => setServiceModalVisible(false)}
                style={styles.modalFooterButton}
              >
                Enter Manually
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Payment Terms Selection Modal */}
      <Portal>
        <Modal
          visible={paymentTermModalVisible}
          onRequestClose={() => setPaymentTermModalVisible(false)}
          animationType="slide"
          transparent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>Select Payment Terms</Text>
                <IconButton icon="close" onPress={() => setPaymentTermModalVisible(false)} />
              </View>

              <FlatList
                data={paymentTerms}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      selectedPaymentTerm?.id === item.id && styles.selectedListItem
                    ]}
                    onPress={() => {
                      setSelectedPaymentTerm(item);
                      setPaymentTermModalVisible(false);
                    }}
                  >
                    <View>
                      <Text variant="bodyLarge" style={styles.listItemTitle}>{item.term_name}</Text>
                      <Text variant="bodySmall" style={styles.listItemSubtitle}>{item.days} days</Text>
                    </View>
                    {selectedPaymentTerm?.id === item.id && (
                      <IconButton icon="check" iconColor={colors.primary[500]} size={20} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text variant="bodyMedium" style={styles.emptyText}>
                      No payment terms found
                    </Text>
                  </View>
                }
                style={styles.list}
              />

              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedPaymentTerm(null);
                  setPaymentTermModalVisible(false);
                }}
                style={styles.modalFooterButton}
              >
                Clear Selection
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
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
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.grey[300],
    borderRadius: 8,
    paddingLeft: 16,
    paddingVertical: 4,
    backgroundColor: colors.background.paper,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    paddingLeft: 16,
    paddingVertical: 4,
    backgroundColor: colors.primary[50],
    marginBottom: 12,
  },
  selectionText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.text.muted,
    fontSize: 16,
  },
  input: {
    marginBottom: 12,
  },
  readOnlyInput: {
    backgroundColor: colors.grey[100],
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
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary[500],
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
  itemLabel: {
    fontWeight: '600',
    color: colors.text.secondary,
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
  saveButton: {
    backgroundColor: colors.primary[500],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[200],
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  searchbar: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 0,
    backgroundColor: colors.grey[100],
  },
  list: {
    maxHeight: 400,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[100],
  },
  selectedListItem: {
    backgroundColor: colors.primary[50],
  },
  listItemTitle: {
    fontWeight: '500',
    color: colors.text.primary,
  },
  listItemSubtitle: {
    color: colors.text.muted,
    marginTop: 2,
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  serviceTag: {
    backgroundColor: colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: colors.text.secondary,
  },
  emptyList: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    marginBottom: 16,
  },
  emptySubtext: {
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: colors.primary[500],
  },
  modalFooterButton: {
    margin: 16,
    marginTop: 8,
  },
});
