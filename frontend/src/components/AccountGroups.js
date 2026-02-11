import React, { useState, useEffect } from 'react';
import { accountGroupAPI } from '../services/api';
import { useToast } from './Toast';
import './Accounting.css';

function AccountGroups() {
  const { showSuccess, showError } = useToast();
  const [groups, setGroups] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('tree');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [error, setError] = useState('');

  const [currentGroup, setCurrentGroup] = useState({
    name: '',
    parent: '',
    nature: 'debit'
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const [listResponse, treeResponse] = await Promise.all([
        accountGroupAPI.getAll(),
        accountGroupAPI.getTree()
      ]);
      setGroups(listResponse.data.results || listResponse.data || []);
      setTreeData(treeResponse.data || []);

      const rootIds = new Set((treeResponse.data || []).map(g => g.id));
      setExpandedGroups(rootIds);
    } catch (err) {
      showError('Failed to load account groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = (parentGroup = null) => {
    setCurrentGroup({
      name: '',
      parent: parentGroup?.id || '',
      nature: parentGroup?.nature || 'debit'
    });
    setShowForm(true);
    setError('');
  };

  const handleEditGroup = (group) => {
    setCurrentGroup({
      id: group.id,
      name: group.name,
      parent: group.parent || '',
      nature: group.nature
    });
    setShowForm(true);
    setError('');
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm('Are you sure you want to delete this account group?')) {
      try {
        await accountGroupAPI.delete(id);
        showSuccess('Account group deleted successfully!');
        loadGroups();
        setSelectedGroup(null);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete account group';
        showError(errorMsg);
      }
    }
  };

  const handleGroupChange = (field, value) => {
    setCurrentGroup({ ...currentGroup, [field]: value });
  };

  const handleSaveGroup = async () => {
    setLoading(true);
    setError('');

    if (!currentGroup.name) {
      setError('Group name is required');
      setLoading(false);
      return;
    }

    try {
      const dataToSave = {
        name: currentGroup.name,
        nature: currentGroup.nature,
        parent: currentGroup.parent || null
      };

      if (currentGroup.id) {
        await accountGroupAPI.update(currentGroup.id, dataToSave);
        showSuccess('Account group updated successfully!');
      } else {
        await accountGroupAPI.create(dataToSave);
        showSuccess('Account group created successfully!');
      }

      setShowForm(false);
      loadGroups();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save account group';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setError('');
  };

  const toggleExpand = (groupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    const collectIds = (nodes) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children && node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(treeData);
    setExpandedGroups(allIds);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Calculate stats
  const stats = {
    total: groups.length,
    debit: groups.filter(g => g.nature === 'debit').length,
    credit: groups.filter(g => g.nature === 'credit').length,
    primary: groups.filter(g => g.is_primary).length
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.full_path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getParentOptions = () => {
    if (currentGroup.id) {
      return groups.filter(g => g.id !== currentGroup.id);
    }
    return groups;
  };

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedGroups.has(node.id);
    const isSelected = selectedGroup?.id === node.id;

    return (
      <React.Fragment key={node.id}>
        <div
          className={`tree-item ${isSelected ? 'selected' : ''} ${node.is_primary ? 'primary' : ''}`}
          style={{ paddingLeft: `${20 + level * 24}px` }}
          onClick={() => setSelectedGroup(node)}
        >
          <div className="tree-item-left">
            {hasChildren ? (
              <button
                className="expand-btn"
                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="expand-placeholder">•</span>
            )}
            <span className={`nature-dot ${node.nature}`}></span>
            <span className="group-name">{node.name}</span>
            {node.is_primary && <span className="primary-badge">Primary</span>}
          </div>
          <div className="tree-item-right">
            <span className="ledger-count">{node.ledger_count || 0} ledgers</span>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="account-groups-container">
      {/* Header */}
      <div className="ag-page-header">
        <div>
          <h1 className="ag-page-title">Account Groups</h1>
          <p className="ag-page-subtitle">Manage your Chart of Accounts hierarchy</p>
        </div>
        <button className="btn-primary" onClick={() => handleAddGroup()}>
          <span>➕</span> Add Group
        </button>
      </div>

      {/* Stats Cards */}
      <div className="ag-stats-grid">
        <div className="ag-stat-card total">
          <div className="ag-stat-label">Total Groups</div>
          <div className="ag-stat-value">{stats.total}</div>
        </div>
        <div className="ag-stat-card debit">
          <div className="ag-stat-label">Debit Nature</div>
          <div className="ag-stat-value">{stats.debit}</div>
        </div>
        <div className="ag-stat-card credit">
          <div className="ag-stat-label">Credit Nature</div>
          <div className="ag-stat-value">{stats.credit}</div>
        </div>
        <div className="ag-stat-card primary">
          <div className="ag-stat-label">Primary Groups</div>
          <div className="ag-stat-value">{stats.primary}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ag-main-content">
        {/* Tree/List Panel */}
        <div className="tree-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span>📂</span> Group Hierarchy
            </div>
            <div className="view-controls">
              <button
                className={`btn-view ${viewMode === 'tree' ? 'active' : ''}`}
                onClick={() => setViewMode('tree')}
              >
                🌲 Tree
              </button>
              <button
                className={`btn-view ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {viewMode === 'tree' && (
              <div className="toolbar-actions">
                <button className="btn-small" onClick={expandAll}>Expand All</button>
                <button className="btn-small" onClick={collapseAll}>Collapse All</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading groups...</span>
            </div>
          ) : viewMode === 'tree' ? (
            <div className="tree-container">
              {treeData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📂</div>
                  <div className="empty-title">No Account Groups</div>
                  <div className="empty-text">Get started by creating your first account group</div>
                  <button className="btn-primary" onClick={() => handleAddGroup()}>
                    <span>➕</span> Add Group
                  </button>
                </div>
              ) : (
                treeData.map(node => renderTreeNode(node))
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="list-table">
                <thead>
                  <tr>
                    <th>Group Name</th>
                    <th>Full Path</th>
                    <th>Nature</th>
                    <th>Sub-Groups</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No groups found
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map(group => (
                      <tr key={group.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`nature-dot ${group.nature}`}></span>
                            {group.name}
                            {group.is_primary && <span className="primary-badge">Primary</span>}
                          </div>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '13px' }}>{group.full_path}</td>
                        <td>
                          <span className={`nature-badge ${group.nature}`}>
                            {group.nature === 'debit' ? '↗ Debit' : '↙ Credit'}
                          </span>
                        </td>
                        <td>{group.children_count || 0}</td>
                        <td>
                          <div className="table-actions">
                            {!group.is_primary && (
                              <>
                                <button className="btn-icon" onClick={() => handleEditGroup(group)} title="Edit">
                                  ✏️
                                </button>
                                <button className="btn-icon danger" onClick={() => handleDeleteGroup(group.id)} title="Delete">
                                  🗑️
                                </button>
                              </>
                            )}
                            <button className="btn-icon" onClick={() => handleAddGroup(group)} title="Add Sub-Group">
                              ➕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="ag-detail-panel">
          {selectedGroup ? (
            <>
              <div className="detail-header">
                <h3 className="detail-title">{selectedGroup.name}</h3>
                <div className="detail-path">{selectedGroup.full_path || selectedGroup.name}</div>
              </div>
              <div className="detail-body">
                <div className="detail-row">
                  <span className="detail-label">Nature</span>
                  <span className={`nature-badge ${selectedGroup.nature}`}>
                    {selectedGroup.nature === 'debit' ? '↗ Debit' : '↙ Credit'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Ledger Accounts</span>
                  <span className="detail-value">{selectedGroup.ledger_count || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Sub-Groups</span>
                  <span className="detail-value">{selectedGroup.children?.length || 0}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">
                    {selectedGroup.is_primary ? 'Primary (System)' : 'Custom'}
                  </span>
                </div>
              </div>
              <div className="detail-actions">
                <button className="btn-action" onClick={() => handleAddGroup(selectedGroup)}>
                  <span>➕</span> Add Sub-Group
                </button>
                {!selectedGroup.is_primary && (
                  <>
                    <button className="btn-action" onClick={() => handleEditGroup(selectedGroup)}>
                      <span>✏️</span> Edit
                    </button>
                    <button className="btn-action danger" onClick={() => handleDeleteGroup(selectedGroup.id)}>
                      <span>🗑️</span> Delete
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="empty-detail">
              <div className="empty-detail-icon">👆</div>
              <div>Select a group to view details</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {currentGroup.id ? 'Edit Account Group' : 'New Account Group'}
              </h2>
              <button className="btn-close" onClick={handleCancelForm}>✕</button>
            </div>

            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Group Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentGroup.name}
                  onChange={(e) => handleGroupChange('name', e.target.value)}
                  placeholder="e.g., Sundry Debtors, Bank Accounts"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Group</label>
                <select
                  className="form-input"
                  value={currentGroup.parent}
                  onChange={(e) => handleGroupChange('parent', e.target.value)}
                >
                  <option value="">None (Root Level)</option>
                  {getParentOptions().map(group => (
                    <option key={group.id} value={group.id}>
                      {group.full_path || group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nature *</label>
                <div className="nature-options">
                  <div
                    className={`nature-option debit ${currentGroup.nature === 'debit' ? 'selected' : ''}`}
                    onClick={() => handleGroupChange('nature', 'debit')}
                  >
                    <div className="nature-option-icon">↗️</div>
                    <div className="nature-option-label">Debit</div>
                    <div className="nature-option-hint">Assets, Expenses</div>
                  </div>
                  <div
                    className={`nature-option credit ${currentGroup.nature === 'credit' ? 'selected' : ''}`}
                    onClick={() => handleGroupChange('nature', 'credit')}
                  >
                    <div className="nature-option-icon">↙️</div>
                    <div className="nature-option-label">Credit</div>
                    <div className="nature-option-hint">Liabilities, Income</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelForm}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSaveGroup}
                disabled={loading}
              >
                {loading ? 'Saving...' : (currentGroup.id ? 'Update Group' : 'Create Group')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountGroups;
