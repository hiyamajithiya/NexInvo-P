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
  Switch,
  IconButton,
  Searchbar,
  Portal,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import {
  Client,
  ScheduledInvoice,
  RootStackParamList,
  ServiceItem,
} from '../../types';
import colors from '../../theme/colors';

type ScheduledInvoiceFormScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ScheduledInvoiceForm'>;
  route: RouteProp<RootStackParamList, 'ScheduledInvoiceForm'>;
};

const frequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const invoiceTypes = [
  { value: 'tax', label: 'Tax Invoice' },
  { value: 'proforma', label: 'Proforma' },
];

interface FormItem {
  description: string;
  hsn_sac: string;
  gst_rate: string;
  taxable_amount: string;
  serviceId?: number;
}

export default function ScheduledInvoiceFormScreen({
  navigation,
  route,
}: ScheduledInvoiceFormScreenProps) {
  const insets = useSafeAreaInsets();
  const scheduledInvoiceId = route.params?.scheduledInvoiceId;
  const isEditing = !!scheduledInvoiceId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Modal states
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);

  // Search states
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('0');
  const [monthOfYear, setMonthOfYear] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState('');
  const [notes, setNotes] = useState('');
  const [autoSendEmail, setAutoSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [items, setItems] = useState<FormItem[]>([
    { description: '', hsn_sac: '', gst_rate: '18', taxable_amount: '' },
  ]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsData, servicesData] = await Promise.all([
        api.getClients(),
        api.getServiceItems(),
      ]);
      const clientsList = clientsData.results || [];
      const servicesList = servicesData.results || [];

      setClients(clientsList);
      setServices(servicesList);

      if (isEditing && scheduledInvoiceId) {
        const scheduleData = await api.getScheduledInvoice(scheduledInvoiceId);
        populateForm(scheduleData, clientsList, servicesList);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (schedule: ScheduledInvoice, clientsList: Client[], servicesList: ServiceItem[]) => {
    setName(schedule.name);
    setInvoiceType(schedule.invoice_type);
    setFrequency(schedule.frequency);
    setDayOfMonth(schedule.day_of_month.toString());
    setDayOfWeek(schedule.day_of_week?.toString() || '0');
    setMonthOfYear(schedule.month_of_year?.toString() || '1');
    setStartDate(schedule.start_date);
    setEndDate(schedule.end_date || '');
    setMaxOccurrences(schedule.max_occurrences?.toString() || '');
    setNotes(schedule.notes || '');
    setAutoSendEmail(schedule.auto_send_email);
    setEmailSubject(schedule.email_subject || '');
    setEmailBody(schedule.email_body || '');

    // Set client
    const client = clientsList.find(c => c.id === schedule.client);
    if (client) setSelectedClient(client);

    // Set items with matching serviceId
    if (schedule.items && schedule.items.length > 0) {
      setItems(schedule.items.map(item => {
        // Try to find matching service by description or SAC code
        const matchingService = servicesList.find(
          s => s.name === item.description ||
               (s.sac_code && s.sac_code === item.hsn_sac)
        );
        return {
          description: item.description,
          hsn_sac: item.hsn_sac,
          gst_rate: String(item.gst_rate),
          taxable_amount: String(item.taxable_amount),
          serviceId: matchingService?.id,
        };
      }));
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
    setItems(newItems);
    setServiceModalVisible(false);
    setCurrentItemIndex(null);
  };

  const addItem = () => {
    setItems([...items, { description: '', hsn_sac: '', gst_rate: '18', taxable_amount: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const taxable = parseFloat(item.taxable_amount) || 0;
      const gstRate = parseFloat(item.gst_rate) || 0;
      const gst = (taxable * gstRate) / 100;
      return sum + taxable + gst;
    }, 0);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the scheduled invoice');
      return;
    }
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (items.some(item => !item.description.trim() || !item.taxable_amount)) {
      Alert.alert('Error', 'Please fill in all item details');
      return;
    }

    setSaving(true);

    try {
      const scheduleData = {
        name: name.trim(),
        client: selectedClient.id,
        invoice_type: invoiceType,
        frequency,
        day_of_month: parseInt(dayOfMonth) || 1,
        day_of_week: frequency === 'weekly' ? parseInt(dayOfWeek) || 0 : undefined,
        month_of_year: frequency === 'yearly' ? parseInt(monthOfYear) || 1 : undefined,
        start_date: startDate,
        end_date: endDate || undefined,
        max_occurrences: maxOccurrences ? parseInt(maxOccurrences) : undefined,
        notes: notes || undefined,
        auto_send_email: autoSendEmail,
        email_subject: autoSendEmail ? emailSubject : undefined,
        email_body: autoSendEmail ? emailBody : undefined,
        items: items.map(item => ({
          description: item.description || '',
          hsn_sac: item.hsn_sac || '',
          gst_rate: parseFloat(item.gst_rate) || 18,
          taxable_amount: parseFloat(item.taxable_amount) || 0,
          total_amount: parseFloat((
            (parseFloat(item.taxable_amount) || 0) +
            ((parseFloat(item.taxable_amount) || 0) * (parseFloat(item.gst_rate) || 18)) / 100
          ).toFixed(2)),
        })),
      };

      if (isEditing && scheduledInvoiceId) {
        await api.updateScheduledInvoice(scheduledInvoiceId, scheduleData);
        Alert.alert('Success', 'Scheduled invoice updated', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.createScheduledInvoice(scheduleData);
        Alert.alert('Success', 'Scheduled invoice created', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('Save error:', error.response?.data || error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save scheduled invoice'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
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
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Basic Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Basic Information
            </Text>

            <TextInput
              mode="outlined"
              label="Schedule Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Monthly Retainer - ABC Corp"
              style={styles.input}
            />

            <Text variant="labelMedium" style={styles.fieldLabel}>
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

            <Text variant="labelMedium" style={styles.fieldLabel}>
              Invoice Type
            </Text>
            <SegmentedButtons
              value={invoiceType}
              onValueChange={(value) => setInvoiceType(value as 'tax' | 'proforma')}
              buttons={invoiceTypes}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        {/* Schedule Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Schedule Settings
            </Text>

            <Text variant="labelMedium" style={styles.fieldLabel}>
              Frequency
            </Text>
            <SegmentedButtons
              value={frequency}
              onValueChange={(value) => setFrequency(value as 'weekly' | 'monthly' | 'yearly')}
              buttons={frequencies}
              style={styles.segmentedButtons}
            />

            {frequency === 'weekly' && (
              <TextInput
                mode="outlined"
                label="Day of Week (0-6, Mon-Sun)"
                value={dayOfWeek}
                onChangeText={setDayOfWeek}
                keyboardType="numeric"
                style={styles.input}
                placeholder="0=Monday, 6=Sunday"
              />
            )}

            {(frequency === 'monthly' || frequency === 'yearly') && (
              <TextInput
                mode="outlined"
                label="Day of Month (1-28)"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            {frequency === 'yearly' && (
              <TextInput
                mode="outlined"
                label="Month of Year (1-12)"
                value={monthOfYear}
                onChangeText={setMonthOfYear}
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            <TextInput
              mode="outlined"
              label="Start Date *"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="End Date (Optional)"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Max Occurrences (Optional)"
              value={maxOccurrences}
              onChangeText={setMaxOccurrences}
              keyboardType="numeric"
              placeholder="Leave empty for unlimited"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Line Items */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Line Items
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
                  label="Description *"
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

                <TextInput
                  mode="outlined"
                  label="Taxable Amount *"
                  value={item.taxable_amount}
                  onChangeText={(value) => updateItem(index, 'taxable_amount', value)}
                  keyboardType="numeric"
                  left={<TextInput.Affix text="₹" />}
                  style={styles.input}
                />
              </View>
            ))}

            <View style={styles.totalContainer}>
              <Text variant="titleMedium">Estimated Total:</Text>
              <Text variant="titleLarge" style={styles.totalAmount}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Email Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.switchRow}>
              <Text variant="titleMedium">Auto-send Email</Text>
              <Switch value={autoSendEmail} onValueChange={setAutoSendEmail} />
            </View>

            {autoSendEmail && (
              <>
                <TextInput
                  mode="outlined"
                  label="Email Subject"
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  style={styles.input}
                />
                <TextInput
                  mode="outlined"
                  label="Email Body"
                  value={emailBody}
                  onChangeText={setEmailBody}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />
              </>
            )}
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
          disabled={saving}
          style={[styles.actionButton, styles.saveButton]}
        >
          {isEditing ? 'Update' : 'Create'} Schedule
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  fieldLabel: {
    color: colors.text.secondary,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: colors.background.paper,
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
    marginBottom: 12,
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
  segmentedButtons: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: colors.primary[500],
  },
  itemContainer: {
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    marginBottom: 12,
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
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginTop: 8,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: colors.primary[500],
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
