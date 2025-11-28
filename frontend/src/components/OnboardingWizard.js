import { useState, useEffect, useCallback } from 'react';
import { settingsAPI, clientAPI, serviceItemAPI } from '../services/api';
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
    ],
    checkKey: 'welcome', // Always mark as done after viewing
    isRequired: false
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
    action: 'settings',
    checkKey: 'company',
    isRequired: true
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
    action: 'settings',
    checkKey: 'invoice',
    isRequired: true
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
    action: 'settings',
    checkKey: 'email',
    isRequired: false // Optional - user may not want email
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
    action: 'clients',
    checkKey: 'client',
    isRequired: true
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
    action: 'services',
    checkKey: 'services',
    isRequired: true
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
    action: 'invoices',
    checkKey: 'ready',
    isRequired: false
  }
];

function OnboardingWizard({ onComplete, onNavigate, onMinimize }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stepsCompleted, setStepsCompleted] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Check actual completion status from backend
  const checkStepsCompletion = useCallback(async () => {
    setIsLoading(true);
    try {
      const completionStatus = {
        welcome: true, // Always complete after first view
        company: false,
        invoice: false,
        email: false,
        client: false,
        services: false,
        ready: false
      };

      // Check company settings
      try {
        const companyRes = await settingsAPI.getCompanySettings();
        if (companyRes.data && companyRes.data.companyName) {
          completionStatus.company = true;
        }
      } catch (e) {
        // Not configured yet
      }

      // Check invoice settings
      try {
        const invoiceRes = await settingsAPI.getInvoiceSettings();
        if (invoiceRes.data && invoiceRes.data.invoicePrefix) {
          completionStatus.invoice = true;
        }
      } catch (e) {
        // Not configured yet
      }

      // Check email settings (optional)
      try {
        const emailRes = await settingsAPI.getEmailSettings();
        if (emailRes.data && emailRes.data.smtp_host) {
          completionStatus.email = true;
        }
      } catch (e) {
        // Not configured yet - this is optional
      }

      // Check if at least one client exists
      try {
        const clientRes = await clientAPI.getAll();
        const clients = clientRes.data.results || clientRes.data || [];
        if (clients.length > 0) {
          completionStatus.client = true;
        }
      } catch (e) {
        // No clients yet
      }

      // Check if at least one service exists
      try {
        const serviceRes = await serviceItemAPI.getAll();
        const services = serviceRes.data.results || serviceRes.data || [];
        if (services.length > 0) {
          completionStatus.services = true;
        }
      } catch (e) {
        // No services yet
      }

      // Ready is complete if all required steps are done
      const requiredSteps = ONBOARDING_STEPS.filter(s => s.isRequired);
      const allRequiredComplete = requiredSteps.every(s => completionStatus[s.checkKey]);
      completionStatus.ready = allRequiredComplete;

      setStepsCompleted(completionStatus);

      // Find first incomplete required step
      const firstIncompleteIndex = ONBOARDING_STEPS.findIndex(
        step => step.isRequired && !completionStatus[step.checkKey]
      );

      if (firstIncompleteIndex !== -1) {
        setCurrentStep(firstIncompleteIndex);
      } else if (allRequiredComplete) {
        // All required steps complete - mark onboarding as done
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_completed_date', new Date().toISOString());
        setIsVisible(false);
        if (onComplete) onComplete();
      }

    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onComplete]);

  useEffect(() => {
    // Check if onboarding was already fully completed
    const completed = localStorage.getItem('onboarding_completed');

    if (completed === 'true') {
      // Even if marked complete, verify actual completion
      checkStepsCompletion();
    } else {
      // First time or incomplete - check status
      checkStepsCompletion();
    }
  }, [checkStepsCompletion]);

  // Re-check completion when wizard becomes visible (e.g., after navigating back)
  useEffect(() => {
    if (isVisible && !isMinimized) {
      checkStepsCompletion();
    }
  }, [isVisible, isMinimized, checkStepsCompletion]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      // Find next incomplete step
      let nextStep = currentStep + 1;
      while (nextStep < ONBOARDING_STEPS.length - 1) {
        const step = ONBOARDING_STEPS[nextStep];
        if (step.isRequired && !stepsCompleted[step.checkKey]) {
          break;
        }
        nextStep++;
      }
      setCurrentStep(nextStep);
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
    // Check if all required steps are actually complete
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.isRequired);
    const allRequiredComplete = requiredSteps.every(s => stepsCompleted[s.checkKey]);

    if (allRequiredComplete) {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_completed_date', new Date().toISOString());
      setIsVisible(false);
      if (onComplete) onComplete();
    } else {
      // Find first incomplete required step
      const firstIncompleteIndex = ONBOARDING_STEPS.findIndex(
        step => step.isRequired && !stepsCompleted[step.checkKey]
      );
      if (firstIncompleteIndex !== -1) {
        setCurrentStep(firstIncompleteIndex);
        alert('Please complete all required setup steps before finishing.');
      }
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    if (onMinimize) onMinimize();
  };

  const handleRestore = () => {
    setIsMinimized(false);
    checkStepsCompletion(); // Re-check when restoring
  };

  const handleGoToSection = (action) => {
    if (action && onNavigate) {
      // Minimize wizard instead of closing
      setIsMinimized(true);
      onNavigate(action);
    }
  };

  const handleLaterReminder = () => {
    // Close wizard for this session but will show again on next login
    setIsVisible(false);
    // Don't set onboarding_completed - it will show again on next login
    if (onComplete) onComplete();
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-modal" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="onboarding-icon">⏳</div>
          <p>Checking setup status...</p>
        </div>
      </div>
    );
  }

  // Minimized floating button
  if (isMinimized) {
    return (
      <button className="onboarding-floating-btn" onClick={handleRestore} title="Continue Setup">
        <span className="floating-icon">📋</span>
        <span className="floating-text">Continue Setup</span>
        <span className="floating-badge">
          {ONBOARDING_STEPS.filter(s => s.isRequired && !stepsCompleted[s.checkKey]).length}
        </span>
      </button>
    );
  }

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isStepComplete = stepsCompleted[step.checkKey];
  const requiredIncomplete = ONBOARDING_STEPS.filter(s => s.isRequired && !stepsCompleted[s.checkKey]).length;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <div className="onboarding-header-actions">
          <button className="onboarding-minimize" onClick={handleMinimize} title="Minimize">
            −
          </button>
          <button className="onboarding-close" onClick={handleLaterReminder} title="Remind me later">
            ×
          </button>
        </div>

        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="onboarding-step-indicator">
          {ONBOARDING_STEPS.map((s, index) => (
            <div
              key={s.id}
              className={`step-dot ${index === currentStep ? 'active' : ''} ${stepsCompleted[s.checkKey] ? 'completed' : ''} ${s.isRequired ? 'required' : ''}`}
              onClick={() => setCurrentStep(index)}
              title={`${s.title}${s.isRequired ? ' (Required)' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-icon">{step.icon}</div>
          <h2 className="onboarding-title">
            {step.title}
            {isStepComplete && <span className="step-complete-badge">✓ Done</span>}
            {step.isRequired && !isStepComplete && <span className="step-required-badge">Required</span>}
          </h2>
          <p className="onboarding-description">{step.description}</p>

          <div className="onboarding-tips">
            {step.tips.map((tip, index) => (
              <div key={index} className="onboarding-tip">
                <span className="tip-icon">{isStepComplete ? '✓' : '○'}</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {step.action && currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
            <button
              className={`onboarding-action-btn ${isStepComplete ? 'completed' : ''}`}
              onClick={() => handleGoToSection(step.action)}
            >
              {isStepComplete ? `Review ${step.action.charAt(0).toUpperCase() + step.action.slice(1)}` : `Go to ${step.action.charAt(0).toUpperCase() + step.action.slice(1)}`}
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
            <button className="onboarding-btn skip" onClick={handleLaterReminder}>
              Later
            </button>
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <button
                className={`onboarding-btn primary ${requiredIncomplete > 0 ? 'disabled' : ''}`}
                onClick={handleComplete}
                disabled={requiredIncomplete > 0}
              >
                {requiredIncomplete > 0 ? `${requiredIncomplete} Steps Left` : 'Finish Setup'}
              </button>
            ) : (
              <button className="onboarding-btn primary" onClick={handleNext}>
                {isStepComplete ? 'Next' : 'Skip for Now'}
              </button>
            )}
          </div>
        </div>

        <div className="onboarding-step-text">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          {requiredIncomplete > 0 && (
            <span className="steps-remaining"> • {requiredIncomplete} required steps remaining</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizard;
