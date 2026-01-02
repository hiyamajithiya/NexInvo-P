import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Divider,
  Button,
  Avatar,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { user, organization, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={getInitials()}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user?.email}
            </Text>
            <View style={styles.orgBadge}>
              <Text variant="labelMedium" style={styles.orgName}>
                {organization?.name}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Account Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Account
          </Text>
        </Card.Content>
        <List.Item
          title="Profile"
          description="View and edit your profile"
          left={(props) => <List.Icon {...props} icon="account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Profile')}
        />
        <Divider />
        <List.Item
          title="Change Password"
          description="Update your password"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </Card>

      {/* Organization Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Organization
          </Text>
        </Card.Content>
        <List.Item
          title="Company Settings"
          description="Manage your company details"
          left={(props) => <List.Icon {...props} icon="domain" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('CompanySettings')}
        />
        <Divider />
        <List.Item
          title="Invoice Settings"
          description="Customize invoice format"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('InvoiceSettings')}
        />
        <Divider />
        <List.Item
          title="Payment Terms"
          description="Manage payment terms"
          left={(props) => <List.Icon {...props} icon="cash" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PaymentTerms')}
        />
        <Divider />
        <List.Item
          title="Service Master"
          description="Manage your services catalog"
          left={(props) => <List.Icon {...props} icon="briefcase" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ServiceMaster')}
        />
        <Divider />
        <List.Item
          title="Reports"
          description="View business reports"
          left={(props) => <List.Icon {...props} icon="chart-bar" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Reports')}
        />
      </Card>

      {/* App Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            App
          </Text>
        </Card.Content>
        <List.Item
          title="Notifications"
          description="Manage notification preferences"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert(
              'Notifications',
              'Notification settings will be available in a future update.',
              [{ text: 'OK' }]
            );
          }}
        />
        <Divider />
        <List.Item
          title="Help & Support"
          description="Get help with the app"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert(
              'Help & Support',
              'For assistance, please contact support@nexinvo.com',
              [{ text: 'OK' }]
            );
          }}
        />
        <Divider />
        <List.Item
          title="About"
          description="App version and info"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            Alert.alert(
              'NexInvo',
              'Version 1.0.0\n\nInvoice Management System\n\n© 2025 Chinmay Technosoft Private Limited'
            );
          }}
        />
      </Card>

      {/* Legal Section */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Legal
          </Text>
        </Card.Content>
        <List.Item
          title="Privacy Policy"
          description="How we handle your data"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
        <Divider />
        <List.Item
          title="Terms of Service"
          description="Usage terms and conditions"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('TermsOfService')}
        />
        <Divider />
        <List.Item
          title="DPDP Compliance"
          description="Data protection compliance"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('DPDPCompliance')}
        />
      </Card>

      {/* Logout Button */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        loading={loggingOut}
        disabled={loggingOut}
        style={styles.logoutButton}
        textColor={colors.error.main}
      >
        Logout
      </Button>

      <Text variant="bodySmall" style={styles.version}>
        NexInvo v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 20,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: colors.primary[500],
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  userEmail: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  orgBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  orgName: {
    color: colors.primary[500],
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: colors.error.main,
    borderRadius: 12,
  },
  version: {
    textAlign: 'center',
    color: colors.text.muted,
    marginTop: 24,
    marginBottom: 16,
  },
});
