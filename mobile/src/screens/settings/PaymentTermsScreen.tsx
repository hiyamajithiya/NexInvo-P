import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  ActivityIndicator,
  IconButton,
  Chip,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { PaymentTerm, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type PaymentTermsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PaymentTerms'>;
};

export default function PaymentTermsScreen({ navigation }: PaymentTermsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [terms, setTerms] = useState<PaymentTerm[]>([]);

  const fetchTerms = async () => {
    try {
      const data = await api.getPaymentTerms();
      setTerms(data.results);
    } catch (error) {
      Alert.alert('Error', 'Failed to load payment terms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTerms();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTerms();
  };

  const handleDelete = (term: PaymentTerm) => {
    Alert.alert(
      'Delete Payment Term',
      `Are you sure you want to delete "${term.term_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePaymentTerm(term.id);
              setTerms(terms.filter(t => t.id !== term.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete payment term');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PaymentTerm }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('PaymentTermForm', { paymentTermId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.termName}>
              {item.term_name}
            </Text>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: item.is_active ? colors.success.light : colors.gray[200] }
              ]}
              textStyle={{
                color: item.is_active ? colors.success.dark : colors.gray[600],
                fontSize: 12,
              }}
            >
              {item.is_active ? 'Active' : 'Inactive'}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.days}>
            {item.days} days
          </Text>
          {item.description && (
            <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <IconButton
          icon="delete-outline"
          iconColor={colors.error.main}
          size={20}
          onPress={() => handleDelete(item)}
        />
      </Card.Content>
    </Card>
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
      <FlatList
        data={terms}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No payment terms found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Add payment terms to use in your invoices
            </Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('PaymentTermForm', {})}
        color={colors.white}
      />
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
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termName: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statusChip: {
    height: 24,
  },
  days: {
    color: colors.primary[500],
    marginTop: 4,
  },
  description: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.gray[400],
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary[500],
  },
});
