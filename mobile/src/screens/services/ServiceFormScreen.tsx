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
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import api from '../../services/api';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ServiceFormScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServiceForm'>;
  route: RouteProp<RootStackParamList, 'ServiceForm'>;
};

const gstRates = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

export default function ServiceFormScreen({
  navigation,
  route,
}: ServiceFormScreenProps) {
  const serviceId = route.params?.serviceId;
  const isEditing = !!serviceId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sacCode, setSacCode] = useState('');
  const [gstRate, setGstRate] = useState('18');

  useEffect(() => {
    if (isEditing && serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    try {
      const data = await api.getServiceItem(serviceId!);
      setName(data.name);
      setDescription(data.description || '');
      setSacCode(data.sac_code || '');
      setGstRate(data.gst_rate.toString());
    } catch (error) {
      console.error('Error fetching service:', error);
      Alert.alert('Error', 'Failed to load service');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a service name');
      return;
    }

    setSaving(true);

    try {
      const serviceData = {
        name: name.trim(),
        description: description.trim() || undefined,
        sac_code: sacCode.trim() || undefined,
        gst_rate: parseFloat(gstRate),
      };

      if (isEditing && serviceId) {
        await api.updateServiceItem(serviceId, serviceData);
        Alert.alert('Success', 'Service updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.createServiceItem(serviceData);
        Alert.alert('Success', 'Service created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('Save error:', error.response?.data || error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save service'
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
              Service Details
            </Text>

            <TextInput
              mode="outlined"
              label="Service Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Tax Audit, GST Return Filing"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Detailed description of the service"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="SAC Code"
              value={sacCode}
              onChangeText={setSacCode}
              placeholder="e.g., 998311"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              GST Rate
            </Text>
            <SegmentedButtons
              value={gstRate}
              onValueChange={setGstRate}
              buttons={gstRates}
              style={styles.segmentedButtons}
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
          {isEditing ? 'Update' : 'Create'} Service
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
  segmentedButtons: {
    marginBottom: 8,
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
