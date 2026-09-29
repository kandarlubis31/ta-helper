import React, { useState, useEffect, useRef, useCallback } from 'react';
import KeyboardShortcuts from './KeyboardShortcuts';

export default function Layout({ tabs, activeTab, onTabChange, children }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tara_theme') || 'dark'; } catch { return 'dark'; }
  });

  // Apply saved theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('tara_theme', next); } catch {}
      return next;
    });
  }, []);

  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const collapsingRef = useRef(false);

  // Track mount state for safe timeouts
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sidebar peek removed — sidebar starts expanded on desktop
  // Collapsed by default only on mobile (handled by useState init)

  const toggleSidebar = useCallback(() => {
    if (!collapsed && isMobile) {
      // Closing: block hover during exit, trigger overlay exit animation then collapse
      collapsingRef.current = true;
      setOverlayExiting(true);
      setTimeout(() => {
        if (!mountedRef.current) return;
        setCollapsed(true);
        setOverlayExiting(false);
        collapsingRef.current = false;
      }, 200);
    } else {
      setCollapsed(prev => !prev);
    }
  }, [collapsed, isMobile]);

  // Sidebar hover expand (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (isMobile || collapsingRef.current) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(true);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    hoverTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setHovered(false);
    }, 100);
  }, [isMobile]);

  // Clear hover when user manually collapses via toggle button
  const handleToggle = useCallback(() => {
    if (isMobile) {
      toggleSidebar();
    } else {
      // Clear hover so sidebar doesn't stay expanded via hover alone
      setHovered(false);
      // If collapsed is already true (sidebar was only expanded via hover),
      // clearing hover is sufficient to collapse it. Otherwise, toggle.
      if (!collapsed) {
        toggleSidebar();
      }
    }
  }, [isMobile, collapsed, toggleSidebar]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Keyboard shortcut listener — also handles Escape for sidebar dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // Escape: dismiss sidebar on mobile, or close shortcuts
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (isMobile && !collapsed) {
          setCollapsed(true);
          return;
        }
        return;
      }

      if (isInput) return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // Ctrl+B or Cmd+B to toggle sidebar on desktop
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (!isMobile) setCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts, isMobile, collapsed]);

  const isEffectivelyCollapsed = collapsed && !hovered;
  const showExpanded = !isEffectivelyCollapsed;

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {!collapsed && isMobile && (
        <div className={`sidebar-overlay${overlayExiting ? ' exiting' : ''}`} onClick={toggleSidebar} />
      )}

      {/* Hamburger button — visible on mobile when collapsed; turns X when open */}
      {isMobile && (
        <button
          className={`hamburger-btn${!collapsed ? ' open' : ''}`}
          onClick={toggleSidebar}
          title={!collapsed ? 'Tutup menu' : 'Buka menu'}
          aria-label={!collapsed ? 'Tutup menu sidebar' : 'Buka menu sidebar'}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      )}

      <aside
        className={`sidebar ${isEffectivelyCollapsed ? 'collapsed' : ''}${hovered ? ' hover-expand' : ''}${isMobile && !collapsed ? ' mobile-open' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Sidebar navigasi"
      >
        <div className="sidebar-header">
          <span className="sidebar-wordmark">{showExpanded ? 'TARA' : 'T'}</span>
          {isMobile && !collapsed && (
            <button className="sidebar-close-btn" onClick={toggleSidebar} title="Tutup sidebar">
              &times;
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { onTabChange(tab.id); if (isMobile) setCollapsed(true); }}
              title={tab.label}
            >
              <span className="sidebar-nav-icon">{tab.icon}</span>
              {showExpanded && <span className="sidebar-nav-label">{tab.label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-footer-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          {showExpanded && (
            <button
              className="sidebar-footer-btn"
              onClick={handleToggle}
              title="Tutup sidebar"
            >
              ◀
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
