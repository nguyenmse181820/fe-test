import React from 'react';

// Simple custom tabs implementation
export const CustomTabs = ({ children, value, onValueChange, className = "" }) => {
  return (
    <div className={className} data-tabs-root>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab: value, onTabChange: onValueChange })
      )}
    </div>
  );
};

export const CustomTabsList = ({ children, className = "", activeTab, onTabChange }) => {
  return (
    <div className={className} role="tablist">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab, onTabChange })
      )}
    </div>
  );
};

export const CustomTabsTrigger = ({ 
  children, 
  value, 
  className = "", 
  disabled = false, 
  activeTab, 
  onTabChange 
}) => {
  const isActive = activeTab === value;
  
  // Apply active styles when the tab is active
  const activeStyles = isActive 
    ? 'bg-white shadow-sm text-blue-600' 
    : disabled 
      ? 'text-gray-400 cursor-not-allowed' 
      : 'text-gray-600 hover:text-gray-800';
  
  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => !disabled && onTabChange && onTabChange(value)}
      className={`${className} ${activeStyles}`}
    >
      {children}
    </button>
  );
};

export const CustomTabsContent = ({ children, value, className = "", activeTab }) => {
  if (activeTab !== value) return null;
  
  return (
    <div
      role="tabpanel"
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
};
