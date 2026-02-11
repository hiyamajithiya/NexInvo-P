import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system';
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
  const [gstRegistrationDate, setGstRegistrationDate] = useState('');
  const [pan, setPan] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState<string | null>(null);

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
      setGstRegistrationDate(data.gstRegistrationDate || '');
      setPan(data.pan || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setLogo(data.logo || null);
    } catch (error) {
      Alert.alert('Error', 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a logo.');
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/png';
          const base64Image = `data:${mimeType};base64,${asset.base64}`;
          setLogo(base64Image);
        } else if (asset.uri) {
          // Read file and convert to base64
          const base64 = await readAsStringAsync(asset.uri, {
            encoding: EncodingType.Base64,
          });
          const mimeType = asset.mimeType || 'image/png';
          const base64Image = `data:${mimeType};base64,${base64}`;
          setLogo(base64Image);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the company logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setLogo(null) },
      ]
    );
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
        gstRegistrationDate: gstRegistrationDate || null,
        pan: pan.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo: logo,
      });
      Alert.alert('Success', 'Company settings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
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
        {/* Company Logo */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Company Logo
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Your logo will appear on invoices and receipts
            </Text>

            <View style={styles.logoContainer}>
              {logo ? (
                <View style={styles.logoPreviewContainer}>
                  <Image
                    source={{ uri: logo }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                  <View style={styles.logoActions}>
                    <Button
                      mode="outlined"
                      onPress={pickImage}
                      icon="image-edit"
                      compact
                    >
                      Change
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={removeLogo}
                      icon="delete"
                      textColor={colors.error.main}
                      compact
                    >
                      Remove
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.logoPlaceholder}
                  onPress={pickImage}
                >
                  <IconButton
                    icon="image-plus"
                    size={40}
                    iconColor={colors.primary[500]}
                  />
                  <Text variant="bodyMedium" style={styles.logoPlaceholderText}>
                    Tap to upload logo
                  </Text>
                  <Text variant="bodySmall" style={styles.logoPlaceholderHint}>
                    PNG, JPG (Max 2MB)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card.Content>
        </Card>

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
              placeholder="e.g., 24XXXXX0000X1Z5"
            />

            <TextInput
              mode="outlined"
              label="GST Registration Date"
              value={gstRegistrationDate}
              onChangeText={setGstRegistrationDate}
              style={styles.input}
              placeholder="YYYY-MM-DD"
            />
            <Text variant="bodySmall" style={styles.hint}>
              Leave blank if not registered under GST
            </Text>

            <TextInput
              mode="outlined"
              label="PAN"
              value={pan}
              onChangeText={setPan}
              autoCapitalize="characters"
              style={styles.input}
              placeholder="e.g., XXXXX0000X"
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
    marginBottom: 8,
    color: colors.text.primary,
  },
  hint: {
    color: colors.text.secondary,
    marginBottom: 12,
  },
  logoContainer: {
    marginTop: 8,
  },
  logoPreviewContainer: {
    alignItems: 'center',
    gap: 16,
  },
  logoPreview: {
    width: 200,
    height: 100,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  logoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  logoPlaceholder: {
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  logoPlaceholderText: {
    color: colors.primary[500],
    fontWeight: '600',
    marginTop: -8,
  },
  logoPlaceholderHint: {
    color: colors.text.secondary,
    marginTop: 4,
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
