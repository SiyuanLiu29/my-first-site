import { useEffect, useRef, useState } from 'react';
import { initial, current, transition, restore, serialize, STORAGE_KEY } from '../engine.js';

function load() {
  let warning = '';
  try {
    const url = new URL(location.href);
    if (url.searchParams.get('reset') === 'true') {
      url.searchParams.delete('reset');
      history.replaceState(null, '', url);
      localStorage.removeItem(STORAGE_KEY);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const state = restore(raw);
        const remaining = JSON.parse(raw).remainingMs;
        return { state, warning, remaining: Number.isFinite(remaining) ? Math.max(0, Math.min(remaining, current(state).delay ?? 0)) : null };
      } catch { warning = '旧的聊天记录暂时无法读取，已开始一段新聊天。'; }
    }
  } catch { warning = '此浏览器无法保存进度，刷新后聊天会重新开始。'; }
  return { state: initial(), warning, remaining: null };
}

export function useConversation() {
  const [loaded] = useState(load);
  const [state, setState] = useState(loaded.state);
  const [warning, setWarning] = useState(loaded.warning);
  const [visible, setVisible] = useState(!document.hidden);
  const stateRef = useRef(state);
  const clockRef = useRef({ id: state.currentNode, remaining: loaded.remaining });
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const persist = (value, remaining) => {
    try { localStorage.setItem(STORAGE_KEY, serialize(value, remaining)); }
    catch { setWarning('此浏览器无法保存进度，刷新后聊天会重新开始。'); }
  };
  const act = action => {
    const next = transition(stateRef.current, action);
    if (next !== stateRef.current) {
      stateRef.current = next;
      persist(next, clockRef.current.id === next.currentNode ? clockRef.current.remaining : undefined);
      setState(next);
    }
  };
  useEffect(() => {
    const node = current(state);
    if (!['message', 'pause', 'time'].includes(node.type)) return;
    const clock = clockRef.current;
    if (clock.id !== node.id) { clock.id = node.id; clock.remaining = null; }
    let remaining = clock.remaining ?? node.delay ?? 0;
    let started = 0;
    let timer;
    const save = () => persist(stateRef.current, remaining);
    const stop = () => {
      clearTimeout(timer);
      if (started) remaining = Math.max(0, remaining - (performance.now() - started));
      started = 0;
      clock.remaining = remaining;
    };
    const start = () => {
      if (document.hidden) return;
      started = performance.now();
      timer = setTimeout(() => {
        started = 0;
        clock.remaining = 0;
        act({ type: 'advance', event: node.id });
      }, remaining);
    };
    const visibility = () => {
      setVisible(!document.hidden);
      stop(); save();
      if (!document.hidden) start();
    };
    const pagehide = () => { stop(); save(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [state.currentNode]);
  return { state, act, warning, dismissWarning: () => setWarning(''), typing: visible && !!current(state).typing };
}
