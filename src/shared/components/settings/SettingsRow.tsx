import React from 'react';

export const SettingsRow: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
  <label className="tc-row">
    {label}
    {children}
  </label>
);
