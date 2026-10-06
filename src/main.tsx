import React, { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/global.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    console.error("Travel OS: falha ao renderizar a interface.");
  }
  render() {
    return this.state.failed ? (
      <main className="center-state">
        <h1>Vamos tentar novamente</h1>
        <p>Não foi possível abrir esta tela.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Recarregar
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
