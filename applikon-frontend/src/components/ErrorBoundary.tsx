import { Component, ReactNode } from 'react'
import i18n from '../i18n'

// Last line of defence: a render-time throw anywhere below unmounts the whole tree and leaves a
// blank page, which is indistinguishable from the app being down. This turns that into a screen
// the user can act on. It only catches renders, so anything thrown from an event handler or an
// async callback still needs its own try/catch. A class because React offers no hook for this.

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // No error-reporting service wired up, so the console is the only record a bug report can quote.
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '5px',
          margin: '20px'
        }}>
          <h2>{i18n.t('errorBoundary.title')}</h2>
          <p>{i18n.t('errorBoundary.message')}</p>
          <p style={{ fontSize: '12px', color: '#6c757d' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {i18n.t('errorBoundary.reload')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
