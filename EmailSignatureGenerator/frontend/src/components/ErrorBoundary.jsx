import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    console.error("ErrorBoundary caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error info:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">
            Something went wrong.
          </h1>
          <p className="text-red-400 mb-2">
            Error: {this.state.error?.message || "Unknown error"}
          </p>
          <p>Please refresh the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
