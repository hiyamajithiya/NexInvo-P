/**
 * Shared stat card styles used across Invoices, Receipts, Payments,
 * ContraVoucher, JournalEntry, CreditNote, and DebitNote components.
 */
export const statCardStyles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  statIcon: {
    fontSize: '20px'
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
    margin: '0'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0'
  }
};
