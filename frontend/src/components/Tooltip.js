import React, { useState } from 'react';
import './Tooltip.css';

/**
 * Tooltip Component - Provides contextual help for form fields
 *
 * Usage:
 * <Tooltip text="This is the help text">
 *   <label>Field Label</label>
 * </Tooltip>
 *
 * Or use the info icon style:
 * <Tooltip text="Help text" icon />
 */
function Tooltip({ children, text, icon = false, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  if (icon) {
    return (
      <span className="tooltip-wrapper tooltip-icon-wrapper">
        <span
          className="tooltip-icon"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={() => setIsVisible(!isVisible)}
        >
          i
        </span>
        {isVisible && (
          <div className={`tooltip-content tooltip-${position}`}>
            <div className="tooltip-arrow"></div>
            {text}
          </div>
        )}
      </span>
    );
  }

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && (
        <div className={`tooltip-content tooltip-${position}`}>
          <div className="tooltip-arrow"></div>
          {text}
        </div>
      )}
    </span>
  );
}

/**
 * FormFieldWithTooltip - Combines a form field with inline tooltip
 *
 * Usage:
 * <FormFieldWithTooltip
 *   label="Company Name"
 *   tooltip="Enter your registered company name"
 *   required
 * >
 *   <input type="text" ... />
 * </FormFieldWithTooltip>
 */
export function FormFieldWithTooltip({ label, tooltip, required, children }) {
  return (
    <div className="form-field-with-tooltip">
      <div className="field-label-row">
        <label className="field-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
        {tooltip && <Tooltip text={tooltip} icon />}
      </div>
      {children}
    </div>
  );
}

/**
 * InfoBox - A larger contextual help box
 *
 * Usage:
 * <InfoBox type="info" title="Quick Tip">
 *   This is some helpful information
 * </InfoBox>
 */
export function InfoBox({ type = 'info', title, children }) {
  const icons = {
    info: 'i',
    tip: '💡',
    warning: '⚠',
    success: '✓'
  };

  return (
    <div className={`info-box info-box-${type}`}>
      <div className="info-box-icon">{icons[type]}</div>
      <div className="info-box-content">
        {title && <div className="info-box-title">{title}</div>}
        <div className="info-box-text">{children}</div>
      </div>
    </div>
  );
}

export default Tooltip;
