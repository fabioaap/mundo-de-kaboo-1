import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import WikiAssistant from '@site/src/components/WikiAssistant';

// Root envolve toda a app e persiste entre navegações — lugar idiomático para
// um widget global. BrowserOnly evita rodar o widget no SSR.
export default function Root({children}: {children: React.ReactNode}): React.ReactElement {
  return (
    <>
      {children}
      <BrowserOnly>{() => <WikiAssistant />}</BrowserOnly>
    </>
  );
}
