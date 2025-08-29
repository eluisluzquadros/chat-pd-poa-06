import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Admin component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          <h2 className="text-lg font-semibold mb-2">Erro no componente administrativo</h2>
          <p>Ocorreu um erro. Tente recarregar a página.</p>
          <button 
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}