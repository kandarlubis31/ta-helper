import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('⚠️ TARA ErrorBoundary caught:', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 40,
          gap: 16,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 28,
            color: 'var(--accent)',
            opacity: 0.6,
          }}>
            ¶
          </div>
          <p style={{
            fontFamily: "'Libre Baskerville', 'Georgia', serif",
            fontSize: 13,
            color: 'var(--text)',
            textAlign: 'center',
            maxWidth: 400,
            lineHeight: 1.7,
          }}>
            Maaf, terjadi kesalahan tak terduga.
          </p>
          <p style={{
            fontFamily: "'Source Code Pro', monospace",
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            className="btn btn-primary"
            onClick={this.handleRetry}
            style={{ marginTop: 8 }}
          >
            coba lagi
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
