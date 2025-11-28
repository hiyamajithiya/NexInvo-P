import React, { useState, useEffect } from 'react';
import './OnboardingWizard.css';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to NexInvo!',
    description: 'Your comprehensive invoice management solution. Let\'s get you set up in just a few steps.',
    icon: '🎉',
    tips: [
      'NexInvo helps you create professional invoices',
      'Track payments and manage clients easily',
      'Generate reports and export data for Tally'
    ]
  },
  {
    id: 'company',
    title: 'Set Up Your Company',
    description: 'Configure your company details that will appear on all invoices.',
    icon: '🏢',
    tips: [
      'Go to Settings > Company Settings',
      'Add your company name, address, and GST number',
      'Upload your company logo for professional invoices'
    ],
    action: 'settings'
  },
  {
    id: 'invoice-settings',
    title: 'Configure Invoice Settings',
    description: 'Customize your invoice format, numbering, and terms.',
    icon: '📋',
    tips: [
      'Set your invoice prefix (e.g., INV-2024-)',
      'Configure GST rates and tax settings',
      'Add default payment terms and notes'
    ],
    action: 'settings'
  },
  {
    id: 'email',
    title: 'Email Configuration',
    description: 'Set up email to send invoices directly to clients.',
    icon: '📧',
    tips: [
      'Configure SMTP settings for email delivery',
      'Customize email templates for invoices',
      'Enable automatic payment reminders'
    ],
    action: 'settings'
  },
  {
    id: 'client',
    title: 'Add Your First Client',
    description: 'Start by adding a client to create invoices for.',
    icon: '👥',
    tips: [
      'Click on "Clients" in the sidebar',
      'Add client name, email, and address',
      'Include GST number for B2B invoices'
    ],
    action: 'clients'
  },
  {
    id: 'services',
    title: 'Set Up Services',
    description: 'Add the services you offer for quick invoice creation.',
    icon: '📦',
    tips: [
      'Go to "Service Master" in the sidebar',
      'Add your service names and default rates',
      'Set up HSN/SAC codes for GST compliance'
    ],
    action: 'services'
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'You\'re ready to create your first invoice. Explore the dashboard to get started.',
    icon: '🚀',
    tips: [
      'Create invoices from the "Invoices" section',
      'Track payments and generate receipts',
      'Access reports for insights and Tally export'
    ],
    action: 'invoices'
  }
];

function OnboardingWizard({ onComplete, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem('onboarding_completed');
    if (completed) {
      setIsVisible(false);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_date', new Date().toISOString());
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleGoToSection = (action) => {
    if (action && onNavigate) {
      handleComplete();
      onNavigate(action);
    }
  };

  if (!isVisible) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={handleSkip} title="Skip Setup">
          ×
        </button>

        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="onboarding-step-indicator">
          {ONBOARDING_STEPS.map((s, index) => (
            <div
              key={s.id}
              className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-icon">{step.icon}</div>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>

          <div className="onboarding-tips">
            {step.tips.map((tip, index) => (
              <div key={index} className="onboarding-tip">
                <span className="tip-icon">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {step.action && currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
            <button
              className="onboarding-action-btn"
              onClick={() => handleGoToSection(step.action)}
            >
              Go to {step.action.charAt(0).toUpperCase() + step.action.slice(1)}
            </button>
          )}
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-nav-left">
            {currentStep > 0 && (
              <button className="onboarding-btn secondary" onClick={handlePrevious}>
                Previous
              </button>
            )}
          </div>
          <div className="onboarding-nav-right">
            <button className="onboarding-btn skip" onClick={handleSkip}>
              Skip
            </button>
            <button className="onboarding-btn primary" onClick={handleNext}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>

        <div className="onboarding-step-text">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
