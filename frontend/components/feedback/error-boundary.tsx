"use client";

import { Component, type ReactNode } from "react";
import { ErrorFallback } from "./error-fallback";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    // Production error reporting can be attached here once a provider is approved.
  }

  private reset = () => {
    this.setState({ failed: false });
  };

  render() {
    if (this.state.failed) return <ErrorFallback onRetry={this.reset} />;
    return this.props.children;
  }
}
