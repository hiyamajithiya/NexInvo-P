import React, { useState, useEffect } from 'react';
import { profileAPI } from '../services/api';
import './Profile.css';

function Profile({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      setProfileData(response.data);
    } catch (err) {
      setErrorMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await profileAPI.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email
      });
      setProfileData(response.data);
      setSuccessMessage('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    // Validate password length
    if (passwordData.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      return;
    }

    try {
      await profileAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setSuccessMessage('Password changed successfully');
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      if (Array.isArray(errorMsg)) {
        setErrorMessage(errorMsg.join(', '));
      } else {
        setErrorMessage(errorMsg || 'Failed to change password');
      }
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>User Profile</h2>
        <p>Manage your account settings</p>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      )}

      {/* Profile Information Section */}
      <div className="profile-section">
        <div className="section-header">
          <h3>Profile Information</h3>
          {!isEditingProfile && (
            <button
              className="btn-secondary"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={profileData.username}
              disabled
              className="form-control disabled"
            />
            <small className="form-text">Username cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              disabled={!isEditingProfile}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              disabled={!isEditingProfile}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              disabled={!isEditingProfile}
              className="form-control"
            />
          </div>

          {isEditingProfile && (
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsEditingProfile(false);
                  loadProfile();
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Change Password Section */}
      <div className="profile-section">
        <div className="section-header">
          <h3>Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="form-control"
              required
              minLength="8"
            />
            <small className="form-text">Password must be at least 8 characters long</small>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="form-control"
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* Logout Section */}
      <div className="profile-section">
        <div className="section-header">
          <h3>Account Actions</h3>
        </div>
        <button onClick={onLogout} className="btn-danger">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Profile;
