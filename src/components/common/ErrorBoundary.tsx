import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    // If it's a chunk mismatch or hook dispatcher mismatch, attempt quick auto-reload once
    const msg = error?.message || '';
    if (
      msg.includes('resolveDispatcher') ||
      msg.includes('Invalid hook call') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch')
    ) {
      const last = parseInt(sessionStorage.getItem('last_auto_err_reload') || '0', 10);
      if (Date.now() - last > 5000) {
        sessionStorage.setItem('last_auto_err_reload', String(Date.now()));
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#181B26] border border-[#272D3E] rounded-3xl p-6 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Terjadi Kendala Memuat Tampilan'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Halaman mengalami penyegaran modul atau kendala sementara. Silakan muat ulang halaman untuk melanjutkan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
              {this.props.onReset && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
