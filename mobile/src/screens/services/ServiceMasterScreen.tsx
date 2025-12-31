import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  ActivityIndicator,
  FAB,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { ServiceItem, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ServiceMasterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ServiceMasterScreen() {
  const navigation = useNavigation<ServiceMasterScreenNavigationProp>();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const fetchServices = async () => {
    try {
      const data = await api.getServiceItems({
        search: search || undefined,
      });
      setServices(data.results || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchServices();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const onSearch = () => {
    setLoading(true);
    fetchServices();
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteServiceItem(id);
              Alert.alert('Success', 'Service deleted successfully');
              fetchServices();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete service');
            }
          },
        },
      ]
    );
    setMenuVisible(null);
  };

  const getGstRateColor = (rate: number) => {
    switch (rate) {
      case 0:
        return { bg: colors.success.light, text: colors.success.dark };
      case 5:
        return { bg: colors.info.light, text: colors.info.dark };
      case 12:
        return { bg: colors.warning.light, text: colors.warning.dark };
      case 18:
        return { bg: colors.primary[100], text: colors.primary[800] };
      case 28:
        return { bg: colors.error.light, text: colors.error.dark };
      default:
        return { bg: colors.gray[100], text: colors.gray[500] };
    }
  };

  const renderService = ({ item }: { item: ServiceItem }) => {
    const gstColor = getGstRateColor(item.gst_rate);

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ServiceForm', { serviceId: item.id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.serviceName}>
                {item.name}
              </Text>
              {item.sac_code && (
                <Text variant="bodySmall" style={styles.sacCode}>
                  SAC: {item.sac_code}
                </Text>
              )}
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.gstBadge, { backgroundColor: gstColor.bg }]}>
                <Text variant="labelMedium" style={{ color: gstColor.text }}>
                  {item.gst_rate}% GST
                </Text>
              </View>
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setMenuVisible(item.id)}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(null);
                    navigation.navigate('ServiceForm', { serviceId: item.id });
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Divider />
                <Menu.Item
                  onPress={() => handleDelete(item.id)}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: colors.error.dark }}
                />
              </Menu>
            </View>
          </View>

          {item.description && (
            <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search services..."
          onChangeText={setSearch}
          value={search}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
        />
      </View>

      {loading && services.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderService}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No services found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Add your first service to get started
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ServiceForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background.paper,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceName: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  sacCode: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  gstBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  description: {
    color: colors.text.secondary,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.text.secondary,
  },
  emptySubtext: {
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
  },
});
