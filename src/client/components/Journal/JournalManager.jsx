import React, { useState } from 'react';
import UploadCard from './UploadCard';
import JournalList from './JournalList';

export default function JournalManager() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [formKey, setFormKey] = React.useState(0);
  const [uploadTags, setUploadTags] = useState([]);
  const [doiTags, setDoiTags] = useState([]);

  const handleJournalAdded = () => {
    setRefreshKey(k => k + 1);
    setUploadTags([]);
    setDoiTags([]);
  };

  const handleReset = () => {
    setFormKey(k => k + 1);
    setRefreshKey(k => k + 1);
    setUploadTags([]);
    setDoiTags([]);
  };

  return (
    <div className="journal-manager">
      <div className="page-header">
        <h2>📚 Repository Jurnal</h2>
        <div className="page-header-right">
          <button className="btn btn-sm btn-secondary" onClick={handleReset} title="Reset form & refresh">
            ↻ Reset
          </button>
        </div>
      </div>
      <div className="page-content">
        <div className="journal-actions">
          <UploadCard
            key={`upload-${formKey}`}
            type="upload"
            title="Upload PDF"
            icon="📄"
            description="Upload file PDF jurnal dari komputermu"
            onSuccess={handleJournalAdded}
            tagState={{ tags: uploadTags, setTags: setUploadTags }}
          />
          <UploadCard
            key={`doi-${formKey}`}
            type="doi"
            title="Input DOI"
            icon="🔗"
            description="Fetch jurnal dari DOI (CrossRef + Unpaywall)"
            onSuccess={handleJournalAdded}
            tagState={{ tags: doiTags, setTags: setDoiTags }}
          />
        </div>
        <JournalList key={refreshKey} />
      </div>
    </div>
  );
}
