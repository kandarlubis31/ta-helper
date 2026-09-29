import React, { useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useConfirm, useToast } from '../../contexts/AppContext';
import MessageList from './MessageList';
import ChatEmpty from './ChatEmpty';
import ChatLoadingSkeleton from './ChatLoadingSkeleton';
import InputBar from './InputBar';
import ScrollToBottom from './ScrollToBottom';
import ThesisTitleModal from './ThesisTitleModal';

export default function ChatWindow() {
  const {
    messages, loading, error, streamingText, isStreaming,
    isNearBottom, messagesEndRef, messagesContainerRef,
    handleScroll, scrollToBottom,
    handleSend, handleClearAll,
    thesisTitle, showThesisModal, historyLoaded,
    confirmThesisTitle, skipThesisTitle, updateThesisTitle,
    academicMode, toggleAcademicMode, handleRegenerate, getApproxTokens,
  } = useChat();

  const confirmAsync = useConfirm();
  const showToast = useToast();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(thesisTitle);

  const handleEditTitle = () => {
    setTitleDraft(thesisTitle);
    setEditingTitle(true);
  };

  const handleSaveTitle = () => {
    updateThesisTitle(titleDraft);
    setEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(false);
    setTitleDraft(thesisTitle);
  };

  const handleClearWithConfirm = async () => {
    const confirmed = await confirmAsync(
      'Apakah anda yakin menghapus konteks ini?\nSemua chat dan judul TA akan dihapus.'
    );
    if (confirmed) {
      await handleClearAll();
      showToast('Konteks berhasil dihapus', 'info');
    }
  };

  return (
    <div className="chat-window">
      {/* Thesis Title Modal — first-time only */}
      {showThesisModal && (
        <ThesisTitleModal
          onConfirm={confirmThesisTitle}
          onSkip={skipThesisTitle}
        />
      )}

      <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {/* Thesis title bar — shown when title is set */}
        {thesisTitle && !showThesisModal && (
          <div className="chat-thesis-bar">
            {editingTitle ? (
              <div className="chat-thesis-edit">
                <span className="chat-thesis-prompt">&gt;</span>
                <input
                  className="chat-thesis-input"
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelEditTitle();
                  }}
                  autoFocus
                  maxLength={200}
                />
                <button className="chat-thesis-save-btn" onClick={handleSaveTitle}>simpan</button>
                <button className="chat-thesis-cancel-btn" onClick={handleCancelEditTitle}>batal</button>
              </div>
            ) : (
              <div className="chat-thesis-display">
                <span className="chat-thesis-icon">&#9733;</span>
                <span className="chat-thesis-text" title={thesisTitle}>
                  {thesisTitle}
                </span>
                <button className="chat-thesis-edit-btn" onClick={handleEditTitle} title="Edit judul TA">
                  &#9998;
                </button>
              </div>
            )}
          </div>
        )}

        <div className="chat-messages-inner">
          {!historyLoaded ? (
            <ChatLoadingSkeleton />
          ) : messages.length === 0 && !isStreaming && !showThesisModal ? (
              <ChatEmpty onSend={handleSend} disabled={loading} thesisTitle={thesisTitle} />
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                streamingText={streamingText}
                loading={loading}
                onRegenerate={handleRegenerate}
              />
            )}
          <div ref={messagesEndRef} />

          {error && <div className="error-msg">{error}</div>}
        </div>

        <ScrollToBottom visible={!isNearBottom} onClick={scrollToBottom} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-inner">
          <InputBar onSend={handleSend} disabled={loading} isStreaming={isStreaming} />
          <div className="chat-input-hint">
            <span className="chat-input-hint-text">
<kbd>Enter</kbd> kirim · <kbd>Shift</kbd>+<kbd>Enter</kbd> baris baru · <kbd>Esc</kbd> hapus teks
            </span>
          </div>
          <div className="chat-input-disclaimer">
            <span>
              {academicMode ? '🎓 Mode akademik — formal, terstruktur, tanpa basa-basi' : 'Hasil AI bersifat sementara — verifikasi fakta sebelum digunakan'}
              {messages.length > 0 && (
                <>
                  {' · '}
                  <span className="chat-token-count">~{getApproxTokens()} token</span>
                  {' · '}
                  <span className="chat-clear-link" onClick={handleClearWithConfirm} title="Hapus semua chat dan konteks">
                    hapus konteks
                  </span>
                </>
              )}
            </span>
            <span
              className={`chat-academic-toggle${academicMode ? ' active' : ''}`}
              onClick={toggleAcademicMode}
              title={academicMode ? 'Matikan mode akademik' : 'Aktifkan mode akademik — AI akan merespon formal & terstruktur'}
            >
              {academicMode ? '🎓 akademik' : '📝 akademik'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
