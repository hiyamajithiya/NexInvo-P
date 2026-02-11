import React, { useState, useEffect } from 'react';
import { accountGroupAPI } from '../services/api';
import { useToast } from './Toast';
import './TallyReport.css';
import './Accounting.css';

function AccountGroups() {
  const { showSuccess, showError } = useToast();
  const [groups, setGroups] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

      // Expand all root nodes by default
      const allIds = new Set();
      const collectIds = (nodes) => {
        nodes.forEach(node => {
          allIds.add(node.id);
          if (node.children && node.children.length > 0) {
            collectIds(node.children);
          }
        });
      };
      collectIds(treeResponse.data || []);
      setExpandedGroups(allIds);
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

  const getHierarchicalGroups = (excludeId = null) => {
    const filtered = excludeId ? groups.filter(g => g.id !== excludeId) : groups;
    return [...filtered].sort((a, b) => {
      const pathA = (a.full_path || a.name || '').toLowerCase();
      const pathB = (b.full_path || b.name || '').toLowerCase();
      return pathA.localeCompare(pathB);
    });
  };

  const getIndentedName = (group) => {
    const path = group.full_path || group.name;
    const depth = (path.match(/>/g) || []).length;
    const prefix = depth > 0 ? '\u00A0\u00A0\u00A0\u00A0'.repeat(depth) + '— ' : '';
    return prefix + group.name;
  };

  const getParentOptions = () => {
    return getHierarchicalGroups(currentGroup.id || null);
  };

  // Filter tree nodes based on search
  const filterTree = (nodes, term) => {
    if (!term) return nodes;
    const lower = term.toLowerCase();
    return nodes.reduce((acc, node) => {
      const match = node.name?.toLowerCase().includes(lower);
      const filteredChildren = node.children ? filterTree(node.children, term) : [];
      if (match || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
      }
      return acc;
    }, []);
  };

  const displayTree = filterTree(treeData, searchTerm);

  const renderTreeNode = (node, level = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedGroups.has(node.id);
    const isSelected = selectedGroup?.id === node.id;

    return (
      <React.Fragment key={node.id}>
        <div
          className={`tally-tree-item ${isSelected ? 'selected' : ''} ${node.is_primary ? 'tally-tree-primary' : ''}`}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => setSelectedGroup(node)}
        >
          {hasChildren ? (
            <span
              className="tally-expand-btn"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="tally-expand-btn" style={{ visibility: 'hidden' }}>▶</span>
          )}
          <span className="tally-tree-name" style={{ fontWeight: node.is_primary || level === 0 ? '700' : '400' }}>
            {node.name}
          </span>
          <span className="tally-tree-count">
            {node.ledger_count || 0} ledgers
          </span>
          <span className={`tally-nature-badge ${node.nature}`}>
            {node.nature === 'debit' ? 'Dr' : 'Cr'}
          </span>
        </div>
        {hasChildren && isExpanded && (
          node.children.map(child => renderTreeNode(child, level + 1))
        )}
      </React.Fragment>
    );
  };

  const stats = {
    total: groups.length,
    primary: groups.filter(g => g.is_primary).length,
    custom: groups.filter(g => !g.is_primary).length
  };

  return (
    <div className="page-content">
      <div className="tally-report">
        <div className="tally-report-header">
          <p className="tally-report-title">Chart of Accounts</p>
          <p className="tally-report-period">
            {stats.total} Groups ({stats.primary} Primary, {stats.custom} Custom)
          </p>
        </div>

        <div className="tally-filter-bar">
          <button className="tally-btn" onClick={() => handleAddGroup()}>+ Add Group</button>
          <div className="tally-actions">
            <button className="tally-btn" onClick={expandAll}>Expand All</button>
            <button className="tally-btn" onClick={collapseAll}>Collapse All</button>
          </div>
        </div>

        {loading && !treeData.length ? (
          <div className="tally-loading">Loading account groups...</div>
        ) : (
          <div className="tally-groups-layout">
            {/* Tree Panel */}
            <div className="tally-tree-panel">
              <div className="tally-tree-toolbar">
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {displayTree.length === 0 ? (
                <div className="tally-empty-state">
                  <p>{searchTerm ? 'No matching groups found' : 'No account groups. Click "+ Add Group" to create one.'}</p>
                </div>
              ) : (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                  {displayTree.map(node => renderTreeNode(node))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="tally-detail-panel">
              {selectedGroup ? (
                <>
                  <h3 className="tally-detail-title">{selectedGroup.name}</h3>
                  <p className="tally-detail-path">{selectedGroup.full_path || selectedGroup.name}</p>

                  <div className="tally-detail-row">
                    <span className="tally-detail-label">Nature</span>
                    <span className="tally-detail-value">
                      {selectedGroup.nature === 'debit' ? 'Debit' : 'Credit'}
                    </span>
                  </div>
                  <div className="tally-detail-row">
                    <span className="tally-detail-label">Ledger Accounts</span>
                    <span className="tally-detail-value">{selectedGroup.ledger_count || 0}</span>
                  </div>
                  <div className="tally-detail-row">
                    <span className="tally-detail-label">Sub-Groups</span>
                    <span className="tally-detail-value">{selectedGroup.children?.length || 0}</span>
                  </div>
                  <div className="tally-detail-row">
                    <span className="tally-detail-label">Type</span>
                    <span className="tally-detail-value">
                      {selectedGroup.is_primary ? 'Primary (System)' : 'Custom'}
                    </span>
                  </div>

                  <div className="tally-detail-actions">
                    <button className="tally-btn" onClick={() => handleAddGroup(selectedGroup)}>
                      + Add Sub-Group
                    </button>
                    {!selectedGroup.is_primary && (
                      <>
                        <button className="tally-btn" onClick={() => handleEditGroup(selectedGroup)}>
                          Edit Group
                        </button>
                        <button className="tally-btn danger" onClick={() => handleDeleteGroup(selectedGroup.id)}>
                          Delete Group
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="tally-empty-state" style={{ paddingTop: '80px' }}>
                  <p>Select a group to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {currentGroup.id ? 'Edit Account Group' : 'New Account Group'}
              </h2>
              <button className="btn-close" onClick={handleCancelForm}>X</button>
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
                      {getIndentedName(group)}
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
                    <div className="nature-option-label">Debit</div>
                    <div className="nature-option-hint">Assets, Expenses</div>
                  </div>
                  <div
                    className={`nature-option credit ${currentGroup.nature === 'credit' ? 'selected' : ''}`}
                    onClick={() => handleGroupChange('nature', 'credit')}
                  >
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
