import React, { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown runtime error' }
  }

  componentDidCatch(error) {
    console.error('UI runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background:
              'radial-gradient(1000px 420px at 72% -12%, rgba(47, 125, 246, 0.18), transparent 70%), #f3f8ff',
            color: '#17385f',
            fontFamily: 'Rajdhani, Noto Sans SC, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              width: '100%',
              border: '1px solid #bfd4ee',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '16px',
              lineHeight: 1.6,
              boxShadow: '0 12px 28px rgba(42, 88, 163, 0.14)',
            }}
          >
            <strong style={{ color: '#c2410c' }}>页面渲染失败</strong>
            <p style={{ margin: '8px 0 0' }}>
              运行时错误：{this.state.message}
            </p>
            <p style={{ margin: '8px 0 0', color: '#5d7595' }}>
              请刷新页面；若仍异常，把这条错误信息发我，我会继续修复。
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
