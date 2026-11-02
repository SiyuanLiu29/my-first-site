import story from './data/conversation.json' with { type: 'json' };

export const STORAGE_KEY = 'today-chat:v1';
export const nodes = story.nodes;
export const current = state => nodes[state.currentNode];
export const optionsFor = state => {
  const node = current(state);
  if (node.type === 'choice') return node.options;
  if (node.type === 'reply') return [{ id: node.id, label: node.text, messages: [node.text], next: node.next }];
  return [];
};

function settle(state) {
  for (let i = 0; i < 100; i++) {
    const node = current(state);
    if (node.type === 'jump') state.currentNode = node.next;
    else if (node.type === 'condition') state.currentNode = state.userTired ? node.yes : node.no;
    else {
      state.conversationFinished = node.type === 'end';
      state.phase = ['reply', 'choice'].includes(node.type) ? 'awaitingReply' : node.type;
      return state;
    }
  }
  throw new Error('Invalid story cycle');
}

export function initial() {
  return settle({ schemaVersion: 1, storyVersion: story.version, currentNode: story.start,
    eventIndex: 0, phase: 'time', draftChoiceId: null, selectedChoices: {}, userTired: false,
    messages: [], committedEventIds: [], ledger: [], conversationFinished: false });
}

export function transition(state, action) {
  const node = current(state);
  if (action.event !== node.id || state.conversationFinished) return state;
  if (action.type === 'draft') {
    if (!optionsFor(state).some(option => option.id === action.option)) return state;
    return { ...state, draftChoiceId: action.option };
  }
  const waiting = ['choice', 'reply'].includes(node.type);
  if (waiting && action.type !== 'send' || !waiting && action.type !== 'advance') return state;
  const option = waiting ? optionsFor(state).find(option => option.id === state.draftChoiceId) : null;
  if (waiting && !option) return state;
  const next = { ...state, messages: [...state.messages], selectedChoices: { ...state.selectedChoices },
    committedEventIds: [...state.committedEventIds, node.id],
    ledger: [...state.ledger, { event: node.id, ...(option ? { option: option.id } : {}) }],
    eventIndex: state.eventIndex + 1, draftChoiceId: null };
  if (option) {
    option.messages.forEach((text, i) => next.messages.push({ id: `${node.id}:${i}`, sender: 'user', text }));
    if (node.type === 'choice') next.selectedChoices[node.id] = option.id;
    if (node.id === 'q6') next.userTired = option.id === '6A';
    next.currentNode = option.next;
  } else {
    if (node.type === 'message' || node.type === 'time') {
      next.messages.push({ id: node.id, sender: node.type === 'time' ? 'time' : 'zhr', text: node.text });
    }
    next.currentNode = node.next;
  }
  return settle(next);
}

// Reconstruct only from legal transitions. Stored HTML, messages and flags are never trusted.
export function restore(raw) {
  const saved = JSON.parse(raw);
  if (saved.schemaVersion !== 1 || saved.storyVersion !== story.version || !Array.isArray(saved.ledger) || saved.ledger.length > 500) throw new Error('Incompatible save');
  let state = initial();
  for (const entry of saved.ledger) {
    if (entry.event !== state.currentNode || state.conversationFinished) throw new Error('Invalid cursor');
    if (entry.option) state = transition(state, { type: 'draft', event: entry.event, option: entry.option });
    const next = transition(state, { type: entry.option ? 'send' : 'advance', event: entry.event });
    if (next === state) throw new Error('Invalid transition');
    state = next;
  }
  if (saved.draftChoiceId) state = transition(state, { type: 'draft', event: state.currentNode, option: saved.draftChoiceId });
  return state;
}

export function serialize(state, remainingMs) {
  return JSON.stringify({ schemaVersion: state.schemaVersion, storyVersion: state.storyVersion,
    ledger: state.ledger, draftChoiceId: state.draftChoiceId, remainingMs });
}
