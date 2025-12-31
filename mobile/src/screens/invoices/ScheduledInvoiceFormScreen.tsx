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
  Switch,
  IconButton,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import {
  Client,
  ScheduledInvoice,
  ScheduledInvoiceItem,
  RootStackParamList,
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
}

export default function ScheduledInvoiceFormScreen({
  navigation,
  route,
}: ScheduledInvoiceFormScreenProps) {
  const scheduledInvoiceId = route.params?.scheduledInvoiceId;
  const isEditing = !!scheduledInvoiceId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientMenuVisible, setClientMenuVisible] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceType, setInvoiceType] = useState<'tax' | 'proforma'>('tax');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('1');
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
      const clientsData = await api.getClients();
      setClients(clientsData.results || []);

      if (isEditing && scheduledInvoiceId) {
        const scheduleData = await api.getScheduledInvoice(scheduledInvoiceId);
        populateForm(scheduleData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (schedule: ScheduledInvoice) => {
    setName(schedule.name);
    setInvoiceType(schedule.invoice_type);
    setFrequency(schedule.frequency);
    setDayOfMonth(schedule.day_of_month.toString());
    setDayOfWeek(schedule.day_of_week?.toString() || '1');
    setMonthOfYear(schedule.month_of_year?.toString() || '1');
    setStartDate(schedule.start_date);
    setEndDate(schedule.end_date || '');
    setMaxOccurrences(schedule.max_occurrences?.toString() || '');
    setNotes(schedule.notes || '');
    setAutoSendEmail(schedule.auto_send_email);
    setEmailSubject(schedule.email_subject || '');
    setEmailBody(schedule.email_body || '');

    // Set client
    const client = clients.find(c => c.id === schedule.client);
    if (client) setSelectedClient(client);

    // Set items
    if (schedule.items && schedule.items.length > 0) {
      setItems(schedule.items.map(item => ({
        description: item.description,
        hsn_sac: item.hsn_sac,
        gst_rate: item.gst_rate,
        taxable_amount: item.taxable_amount,
      })));
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setClientMenuVisible(false);
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
        day_of_week: frequency === 'weekly' ? parseInt(dayOfWeek) || 1 : undefined,
        month_of_year: frequency === 'yearly' ? parseInt(monthOfYear) || 1 : undefined,
        start_date: startDate,
        end_date: endDate || undefined,
        max_occurrences: maxOccurrences ? parseInt(maxOccurrences) : undefined,
        notes: notes || undefined,
        auto_send_email: autoSendEmail,
        email_subject: autoSendEmail ? emailSubject : undefined,
        email_body: autoSendEmail ? emailBody : undefined,
        items: items.map(item => ({
          description: item.description,
          hsn_sac: item.hsn_sac,
          gst_rate: item.gst_rate,
          taxable_amount: item.taxable_amount,
          total_amount: (
            parseFloat(item.taxable_amount) +
            (parseFloat(item.taxable_amount) * parseFloat(item.gst_rate)) / 100
          ).toFixed(2),
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
            <Menu
              visible={clientMenuVisible}
              onDismiss={() => setClientMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setClientMenuVisible(true)}
                  style={styles.selectButton}
                  contentStyle={styles.selectButtonContent}
                >
                  {selectedClient ? selectedClient.name : 'Select Client'}
                </Button>
              }
            >
              {clients && clients.length > 0 ? (
                clients.map((client) => (
                  <Menu.Item
                    key={client.id}
                    onPress={() => handleClientSelect(client)}
                    title={`${client.name}${client.email ? ` - ${client.email}` : ''}`}
                  />
                ))
              ) : (
                <Menu.Item title="No clients available" disabled />
              )}
            </Menu>

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
                label="Day of Week (1-7, Mon-Sun)"
                value={dayOfWeek}
                onChangeText={setDayOfWeek}
                keyboardType="numeric"
                style={styles.input}
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
              <Button mode="text" onPress={addItem} icon="plus">
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
                  label="Description *"
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
          style={[styles.actionButton, styles.saveButton]}
        >
          {isEditing ? 'Update' : 'Create'} Schedule
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
  selectButton: {
    justifyContent: 'flex-start',
    borderColor: colors.primary[500],
    marginBottom: 12,
  },
  selectButtonContent: {
    justifyContent: 'flex-start',
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
});
