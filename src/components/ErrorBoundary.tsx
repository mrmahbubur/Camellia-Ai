import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error.'
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application error caught by ErrorBoundary:', error);
  }

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('camellia_chat_sessions');
      localStorage.removeItem('camellia_active_session_id');
      localStorage.removeItem('camellia_user_settings');
    } catch {
      // ignore storage errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#0e0e10] text-neutral-100 font-sans">
          <div className="max-w-md w-full rounded-2xl border border-neutral-800 bg-[#16161a] p-6 space-y-4 shadow-xl">
            <h1 className="text-lg font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Camellia AI encountered an unexpected client error ({this.state.message}). You can reload cleanly below.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="px-4 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
