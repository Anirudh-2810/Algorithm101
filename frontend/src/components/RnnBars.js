import { useEffect, useRef, useCallback } from "react";

const NODES = 12;
const NODE_LABELS = ['Pop', 'HH', 'EDM', 'R&B', 'Lat', 'Rock', 'KP', 'Ctry', 'N8', 'N9', 'N10', 'N11'];

class LocalRNN {
  constructor(nodes) {
    this.nodes = nodes;
    this.state = new Float32Array(nodes).fill(0.1);
    this.weights = new Float32Array(nodes);
    for (let i = 0; i < nodes; i++) {
      this.weights[i] = Math.random();
    }
  }

  process(inputSignal) {
    for (let i = 0; i < this.nodes; i++) {
      this.state[i] = Math.tanh(this.state[i] * 0.8 + inputSignal * this.weights[i]);
    }
    return this.state;
  }
}

export function RnnBars({ hiddenState }) {
  const containerRef = useRef(null);
  const rnnRef = useRef(new LocalRNN(NODES));
  const rafRef = useRef(null);

  const animate = useCallback(() => {
    const rnn = rnnRef.current;
    const signal = Math.sin(Date.now() / 1000);
    const state = rnn.process(signal);

    const bars = containerRef.current?.querySelectorAll('.rnn-bar');
    if (bars) {
      bars.forEach((bar, i) => {
        const val = Math.abs(state[i]) * 100;
        bar.style.height = `${val}px`;
        bar.style.opacity = 0.3 + (val / 100);
      });
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  // Seed from API hidden state when available
  useEffect(() => {
    if (hiddenState && hiddenState.length >= 4) {
      const rnn = rnnRef.current;
      for (let i = 0; i < Math.min(hiddenState.length, NODES); i++) {
        rnn.state[i] = hiddenState[i] || rnn.state[i];
      }
    }
  }, [hiddenState]);

  return (
    <div ref={containerRef} className="rnn-container" data-testid="rnn-bars">
      {Array.from({ length: NODES }).map((_, i) => (
        <div className="rnn-bar-wrapper" key={i}>
          <div
            className="rnn-bar"
            style={{ background: i < 4 ? 'var(--indigo)' : 'var(--cyan)', height: '10px' }}
          />
          <span className="ui-label" style={{ fontSize: '8px' }}>{NODE_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}
