import React from 'react';

/**
 * Review Prompt Popup - A modal overlay that prompts users to leave a review.
 * Shown during logout flow for eligible users who haven't submitted a review yet.
 *
 * @param {boolean} isOpen - Whether the popup is visible
 * @param {number} dismissalCount - How many times the user has dismissed the prompt (0-2)
 * @param {function} onReview - Called when user clicks "Write a Review"
 * @param {function} onDismiss - Called when user clicks "Maybe Later"
 */
function ReviewPromptPopup({ isOpen, dismissalCount, onReview, onDismiss }) {
  if (!isOpen) return null;

  const remindersLeft = 3 - (dismissalCount || 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '36px'
        }}>
          {'\u2B50'}
        </div>
        <h2 style={{
          color: '#111827',
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '12px'
        }}>
          Share Your Experience!
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          We'd love to hear your feedback! Your review helps us improve and helps others discover our service.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onReview}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{'\u270D\uFE0F'}</span> Write a Review
          </button>
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '14px 28px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Maybe Later
          </button>
        </div>
        <p style={{
          color: '#9ca3af',
          fontSize: '12px',
          marginTop: '16px'
        }}>
          {remindersLeft} reminder{remindersLeft !== 1 ? 's' : ''} left
        </p>
      </div>
    </div>
  );
}

export default ReviewPromptPopup;
