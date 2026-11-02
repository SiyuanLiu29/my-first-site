import React, { useLayoutEffect, useRef, useState } from 'react';
import { optionsFor } from './engine.js';
import { useConversation } from './hooks/useConversation.js';

function Avatar({ user = false }) {
  return <span className={`avatar ${user ? 'avatar-user' : ''}`} aria-hidden="true">
    {user ? <svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="6"/><path d="M9 35c0-14 22-14 22 0"/></svg> : <svg viewBox="0 0 40 40"><circle className="moon" cx="28" cy="12" r="4"/><path d="M0 33 13 17 26 33Z"/><path className="hill" d="m16 40 13-20 17 20Z"/></svg>}
  </span>;
}

export default function App() {
  const { state, act, warning, dismissWarning, typing } = useConversation();
  const choices = optionsFor(state);
  const draft = choices.find(choice => choice.id === state.draftChoiceId);
  const scroll = useRef(null);
  const bottom = useRef(true);
  const force = useRef(false);
  const footer = useRef(null);
  const [unread, setUnread] = useState(false);
  const previousCount = useRef(0);
  const goBottom = (smooth = true) => {
    const element = scroll.current;
    element?.scrollTo({ top: element.scrollHeight, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    bottom.current = true;
    setUnread(false);
  };
  useLayoutEffect(() => {
    const added = state.messages.length > previousCount.current;
    if (bottom.current || force.current) goBottom(previousCount.current > 0);
    else if (added) setUnread(true);
    force.current = false;
    previousCount.current = state.messages.length;
  }, [state.messages.length, state.currentNode, state.draftChoiceId]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => { if (bottom.current) goBottom(false); });
    observer.observe(footer.current);
    return () => observer.disconnect();
  }, []);
  const send = event => {
    event.preventDefault();
    if (!draft) return;
    force.current = true;
    act({ type: 'send', event: state.currentNode });
  };
  const lastMessage = state.messages.at(-1);
  return <main className="chat-shell" aria-label="与张函瑞的聊天">
    <header className="chat-header">
      <span className="header-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m15 4-8 8 8 8"/></svg></span>
      <h1>{typing ? '对方正在输入…' : '张函瑞'}</h1>
      <span className="header-icon more" aria-hidden="true">•••</span>
    </header>
    {warning && <div className="notice" role="status"><span>{warning}</span><button onClick={dismissWarning} aria-label="关闭提示">×</button></div>}
    <section ref={scroll} className="chat-history" aria-label="聊天记录" tabIndex="0" onScroll={() => {
      const el = scroll.current;
      bottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (bottom.current) setUnread(false);
    }}>
      {state.messages.map(message => message.sender === 'time' ?
        <div className="timestamp" key={message.id}>{message.text}</div> :
        <div className={`message ${message.sender === 'user' ? 'outgoing' : 'incoming'}`} key={message.id}>
          <Avatar user={message.sender === 'user'} />
          <div className="bubble"><span className="sr-only">{message.sender === 'user' ? '我' : '张函瑞'}：</span>{message.text}</div>
        </div>)}
    </section>
    <div className="sr-only" aria-live="polite" aria-atomic="true">{lastMessage && lastMessage.sender !== 'time' ? `${lastMessage.sender === 'user' ? '我' : '张函瑞'}：${lastMessage.text}` : ''}</div>
    <footer ref={footer} className="composer">
      {unread && <button className="new-message" onClick={() => goBottom()}>↓ 新消息</button>}
      {choices.length > 0 && <div className="choices" aria-label="候选回复">
        {choices.map(choice => <button key={choice.id} className="choice" aria-pressed={draft?.id === choice.id}
          onClick={() => act({ type: 'draft', event: state.currentNode, option: choice.id })}>{choice.label}</button>)}
      </div>}
      <form className="input-row" onSubmit={send}>
        <div className="draft" role="textbox" aria-label="待发送的回复" aria-readonly="true" tabIndex="0">{draft?.label || <span className="placeholder">{choices.length ? '选择一句回复' : ''}</span>}</div>
        <button className="send" aria-label="发送" disabled={!draft}>发送</button>
      </form>
    </footer>
  </main>;
}
