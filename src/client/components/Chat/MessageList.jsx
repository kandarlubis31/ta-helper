import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import ThinkingIndicator from './ThinkingIndicator';

// ── Group consecutive AI messages that follow the same user message ──
function groupMessages(messages) {
  const groups = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (!msg.content) { i++; continue; }

    if (msg.role === 'user') {
      // Collect consecutive AI responses after this user message
      const userMsg = msg;
      const aiResponses = [];
      i++;
      while (i < messages.length && messages[i].role === 'assistant' && messages[i].content) {
        aiResponses.push(messages[i]);
        i++;
      }
      groups.push({ type: 'exchange', user: userMsg, responses: aiResponses });
    } else {
      // Standalone AI message (shouldn't normally happen)
      groups.push({ type: 'ai', msg });
      i++;
    }
  }
  return groups;
}

export default function MessageList({ messages, isStreaming, streamingText, loading, onRegenerate }) {
  const showThinking = loading && !isStreaming && messages.length > 0;

  // Track active response index per group (keyed by group index)
  const [activeIdxs, setActiveIdxs] = useState({});
  // Track previous response count per group to auto-switch to latest
  const prevCountsRef = useRef({});

  const groups = groupMessages(messages);

  // Auto-switch to latest response when new responses are added to a group
  useEffect(() => {
    groups.forEach((group, gi) => {
      if (group.type !== 'exchange') return;
      const newCount = group.responses.length;
      const prevCount = prevCountsRef.current[gi] ?? 0;
      if (newCount > prevCount) {
        setActiveIdxs(prev => ({ ...prev, [gi]: newCount - 1 }));
      }
      prevCountsRef.current[gi] = newCount;
    });
  }, [groups]);

  // Find which group is the last one (for regenerate button placement)
  let lastExchangeIdx = -1;
  for (let g = groups.length - 1; g >= 0; g--) {
    if (groups[g].type === 'exchange' && groups[g].responses.length > 0) {
      lastExchangeIdx = g;
      break;
    }
  }

  return (
    <>
      {groups.map((group, gi) => {
        if (group.type === 'ai') {
          // Standalone AI message
          const showGap = gi > 0;
          return (
            <React.Fragment key={gi}>
              {showGap && <hr className="message-gap" />}
              <MessageBubble
                role={group.msg.role}
                content={group.msg.content}
                relevantJournals={group.msg.relevantJournals}
                journalRefs={group.msg.journalRefs}
                responseNum={group.msg.responseNum}
              />
            </React.Fragment>
          );
        }

        // Exchange: user message + AI response(s)
        const { user, responses } = group;
        const showGap = gi > 0;
        const activeIdx = activeIdxs[gi] ?? (responses.length - 1); // default: last response
        const activeResp = responses[activeIdx];
        const isLastExchange = gi === lastExchangeIdx;

        const setActive = (idx) => {
          setActiveIdxs(prev => {
            if (prev[gi] === idx) return prev;
            return { ...prev, [gi]: idx };
          });
        };

        // Only show regenerate on the LAST exchange's last response
        const showRegenerate = isLastExchange && onRegenerate != null && !isStreaming && !loading;

        return (
          <React.Fragment key={gi}>
            {showGap && <hr className="message-gap" />}

            {/* User message */}
            <MessageBubble
              role={user.role}
              content={user.content}
              relevantJournals={user.relevantJournals}
              journalRefs={user.journalRefs}
            />

            {/* Response tab navigation — only show if multiple responses */}
            {responses.length > 1 && (
              <div className="response-tabs">
                <button
                  className="response-tab-arrow"
                  disabled={activeIdx === 0}
                  onClick={() => setActive(activeIdx - 1)}
                  aria-label="Response sebelumnya"
                >
                  ←
                </button>
                <div className="response-tab-pills">
                  {responses.map((r, ri) => {
                    const num = r.responseNum || ri + 1;
                    return (
                      <button
                        key={ri}
                        className={`response-tab-pill${ri === activeIdx ? ' active' : ''}`}
                        onClick={() => setActive(ri)}
                      >
                        #{num}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="response-tab-arrow"
                  disabled={activeIdx === responses.length - 1}
                  onClick={() => setActive(activeIdx + 1)}
                  aria-label="Response selanjutnya"
                >
                  →
                </button>
              </div>
            )}

            {/* Active AI response */}
            {activeResp && (
              <MessageBubble
                role={activeResp.role}
                content={activeResp.content}
                relevantJournals={activeResp.relevantJournals}
                journalRefs={activeResp.journalRefs}
                responseNum={activeResp.responseNum}
                isLastAi={showRegenerate && activeIdx === responses.length - 1}
                onRegenerate={showRegenerate ? onRegenerate : undefined}
              />
            )}
          </React.Fragment>
        );
      })}

      {showThinking && (
        <>
          {messages.length > 0 && <hr className="message-gap" />}
          <ThinkingIndicator />
        </>
      )}

      {isStreaming && streamingText && (
        <>
          {messages.length > 0 && <hr className="message-gap" />}
          <MessageBubble
            role="assistant"
            content={streamingText}
            isStreaming={true}
          />
        </>
      )}
    </>
  );
}
