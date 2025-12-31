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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { CompanySettings, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type CompanySettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CompanySettings'>;
};

export default function CompanySettingsScreen({ navigation }: CompanySettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getCompanySettings();
      setSettings(data);
      setCompanyName(data.companyName || '');
      setTradingName(data.tradingName || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setPinCode(data.pinCode || '');
      setStateCode(data.stateCode || '');
      setGstin(data.gstin || '');
      setPan(data.pan || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
    } catch (error) {
      console.error('Error fetching company settings:', error);
      Alert.alert('Error', 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }

    setSaving(true);
    try {
      await api.updateCompanySettings({
        companyName: companyName.trim(),
        tradingName: tradingName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        stateCode: stateCode.trim(),
        gstin: gstin.trim(),
        pan: pan.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      Alert.alert('Success', 'Company settings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error updating company settings:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to update company settings'
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
        {/* Basic Information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Basic Information
            </Text>

            <TextInput
              mode="outlined"
              label="Company Name *"
              value={companyName}
              onChangeText={setCompanyName}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Trading Name"
              value={tradingName}
              onChangeText={setTradingName}
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
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Address Information */}
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
              numberOfLines={3}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="City"
              value={city}
              onChangeText={setCity}
              style={styles.input}
            />

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="State"
                value={state}
                onChangeText={setState}
                style={[styles.input, styles.halfInput]}
              />

              <TextInput
                mode="outlined"
                label="PIN Code"
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
              />
            </View>

            <TextInput
              mode="outlined"
              label="State Code"
              value={stateCode}
              onChangeText={setStateCode}
              keyboardType="numeric"
              style={styles.input}
            />
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
              onChangeText={setGstin}
              autoCapitalize="characters"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="PAN"
              value={pan}
              onChangeText={setPan}
              autoCapitalize="characters"
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
