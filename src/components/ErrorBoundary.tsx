import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches uncaught render-time exceptions so a single component bug doesn't
// white-screen the whole app. Falls back to a recoverable error screen with
// a "copy details" affordance.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private copyDetails = async () => {
    const { error } = this.state;
    if (!error) return;
    const text = `${error.name}: ${error.message}\n\n${error.stack ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can fail in non-secure contexts; ignore.
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6">
        <div className="max-w-lg w-full bg-card border-2 rounded-2xl shadow-soft p-6 space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The app hit an unexpected error. Your data in Google Sheets is unaffected.
            </p>
          </div>
          <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-40">
            {error.message}
          </pre>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={this.copyDetails}>Copy details</Button>
            <Button variant="outline" onClick={() => location.reload()}>Reload</Button>
            <Button onClick={this.reset}>Try again</Button>
          </div>
        </div>
      </div>
    );
  }
}
