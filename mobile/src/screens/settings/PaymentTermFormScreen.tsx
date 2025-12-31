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
import { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type PaymentTermFormScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PaymentTermForm'>;
  route: RouteProp<RootStackParamList, 'PaymentTermForm'>;
};

export default function PaymentTermFormScreen({ navigation, route }: PaymentTermFormScreenProps) {
  const { paymentTermId } = route.params || {};
  const isEditing = !!paymentTermId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [termName, setTermName] = useState('');
  const [days, setDays] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEditing) {
      fetchPaymentTerm();
    }
  }, [paymentTermId]);

  const fetchPaymentTerm = async () => {
    try {
      const data = await api.getPaymentTerm(paymentTermId!);
      setTermName(data.term_name || '');
      setDays(data.days?.toString() || '');
      setDescription(data.description || '');
      setIsActive(data.is_active ?? true);
    } catch (error) {
      console.error('Error fetching payment term:', error);
      Alert.alert('Error', 'Failed to load payment term');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!termName.trim()) {
      Alert.alert('Error', 'Term name is required');
      return;
    }
    if (!days.trim() || isNaN(parseInt(days))) {
      Alert.alert('Error', 'Valid number of days is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        term_name: termName.trim(),
        days: parseInt(days),
        description: description.trim(),
        is_active: isActive,
      };

      if (isEditing) {
        await api.updatePaymentTerm(paymentTermId!, payload);
        Alert.alert('Success', 'Payment term updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.createPaymentTerm(payload);
        Alert.alert('Success', 'Payment term created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('Error saving payment term:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} payment term`
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
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Term Details
            </Text>

            <TextInput
              mode="outlined"
              label="Term Name *"
              value={termName}
              onChangeText={setTermName}
              placeholder="e.g., Net 30"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Days *"
              value={days}
              onChangeText={setDays}
              keyboardType="numeric"
              placeholder="Number of days until payment is due"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder="Optional description"
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <View>
                <Text variant="bodyLarge">Active</Text>
                <Text variant="bodySmall" style={styles.switchHint}>
                  Only active terms can be used in invoices
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                color={colors.primary[500]}
              />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

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
          {isEditing ? 'Update' : 'Create'}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchHint: {
    color: colors.text.secondary,
    marginTop: 2,
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
