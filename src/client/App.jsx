import React, { useState } from 'react';
import Layout from './components/shared/Layout';
import ChatWindow from './components/Chat/ChatWindow';
import JournalManager from './components/Journal/JournalManager';
import PlagReport from './components/PlagCheck/PlagReport';
import ProgressBoard from './components/Progress/ProgressBoard';
import SettingsPage from './components/Settings/SettingsPage';
import CitationGenerator from './components/Citations/CitationGenerator';
import ErrorBoundary from './components/shared/ErrorBoundary';

const TABS = [
  { id: 'chat', icon: '[C]', label: 'konsultasi' },
  { id: 'journals', icon: '[J]', label: 'jurnal' },
  { id: 'plagcheck', icon: '[P]', label: 'plagiasi' },
  { id: 'progress', icon: '[B]', label: 'progres' },
  { id: 'citations', icon: '[S]', label: 'sitasi' },
  { id: 'settings', icon: '[.]', label: 'pengaturan' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatWindow />;
      case 'journals':
        return <JournalManager />;
      case 'plagcheck':
        return <PlagReport />;
      case 'progress':
        return <ProgressBoard onTabChange={setActiveTab} />;
      case 'settings':
        return <SettingsPage />;
      case 'citations':
        return <CitationGenerator onBack={() => setActiveTab('journals')} />;
      default:
        return <ChatWindow />;
    }
  };

  return (
    <Layout
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <ErrorBoundary key={activeTab}>
        {renderContent()}
      </ErrorBoundary>
    </Layout>
  );
}
