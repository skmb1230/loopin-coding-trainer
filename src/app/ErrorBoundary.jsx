import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-loading"><span className="brand-mark">L</span><h1>화면을 표시하지 못했어요.</h1><p role="alert">학습 기록은 삭제하지 않았습니다. 새로고침한 뒤 다시 열어 주세요.</p><button className="primary-button" onClick={() => window.location.reload()}>앱 새로고침</button><button className="secondary-button" onClick={() => { window.history.replaceState(null, '', '#settings'); window.location.reload(); }}>설정에서 백업 확인</button></main>;
  }
}
