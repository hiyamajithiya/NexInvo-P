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
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ClientFormScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ClientForm'>;
  route: RouteProp<RootStackParamList, 'ClientForm'>;
};

export default function ClientFormScreen({
  navigation,
  route,
}: ClientFormScreenProps) {
  const insets = useSafeAreaInsets();
  const clientId = route.params?.clientId;
  const isEditing = !!clientId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchClient();
    }
  }, []);

  const fetchClient = async () => {
    try {
      const data = await api.getClient(clientId!);
      setName(data.name);
      setEmail(data.email || '');
      setMobile(data.mobile || data.phone || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPinCode(data.pinCode || '');
      setStateCode(data.stateCode || '');
      setGstin(data.gstin || '');
      setPan(data.pan || '');
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    // Validate GSTIN if provided
    if (gstin && gstin.length !== 15) {
      Alert.alert('Error', 'GSTIN must be 15 characters');
      return;
    }

    setSaving(true);

    try {
      const clientData = {
        name: name.trim(),
        email: email.trim() || '',
        phone: '',  // Send empty phone to avoid backend issues
        mobile: mobile.trim() || '',
        address: address.trim() || '',
        city: city.trim() || '',
        state: state.trim() || '',
        pinCode: pinCode.trim() || '',
        stateCode: stateCode.trim() || (gstin ? gstin.substring(0, 2) : ''),
        gstin: gstin.trim().toUpperCase() || '',
        pan: pan.trim().toUpperCase() || '',
      };

      if (isEditing) {
        await api.updateClient(clientId!, clientData);
      } else {
        await api.createClient(clientData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save client'
      );
    } finally {
      setSaving(false);
    }
  };

  // Auto-fill state code from GSTIN
  const handleGstinChange = (value: string) => {
    const uppercaseValue = value.toUpperCase();
    setGstin(uppercaseValue);

    if (uppercaseValue.length >= 2) {
      setStateCode(uppercaseValue.substring(0, 2));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
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
              label="Client Name *"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Address */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Address
            </Text>

            <TextInput
              mode="outlined"
              label="Address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="City"
                value={city}
                onChangeText={setCity}
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                mode="outlined"
                label="State"
                value={state}
                onChangeText={setState}
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="PIN Code"
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="numeric"
                maxLength={6}
                style={[styles.input, styles.halfInput]}
              />
              <TextInput
                mode="outlined"
                label="State Code"
                value={stateCode}
                onChangeText={setStateCode}
                keyboardType="numeric"
                maxLength={2}
                style={[styles.input, styles.halfInput]}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Tax Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tax Information
            </Text>

            <TextInput
              mode="outlined"
              label="GSTIN"
              value={gstin}
              onChangeText={handleGstinChange}
              autoCapitalize="characters"
              maxLength={15}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="PAN"
              value={pan}
              onChangeText={(value) => setPan(value.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
              style={styles.input}
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
          style={styles.actionButton}
        >
          {isEditing ? 'Update' : 'Create'} Client
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
    marginBottom: 16,
    color: colors.text.primary,
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
