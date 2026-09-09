import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('FreightIQ Uncaught Error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f8', padding: 20 }}>
          <div style={{ background: 'white', border: '1px solid #dde3f4', borderRadius: 8, padding: 32, maxWidth: 500, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,48,135,0.08)' }}>
            <div style={{ color: '#b71c1c', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Application Error</div>
            <p style={{ color: '#4a5568', fontSize: 14, marginBottom: 16 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the application.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#003087', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
