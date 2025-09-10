import React from 'react';

export const SettingsGroup: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <fieldset className="tc-group">
    <legend>{title}</legend>
    {children}
  </fieldset>
);
