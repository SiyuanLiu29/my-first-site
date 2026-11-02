import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initial, current, optionsFor, transition, restore, serialize, nodes } from '../src/engine.js';

function play(letter, visited = new Set()) {
  let state = initial();
  for (let i = 0; i < 500 && !state.conversationFinished; i++) {
    const node = current(state);
    visited.add(node.id);
    const options = optionsFor(state);
    if (options.length) {
      const option = options.find(o => o.id.endsWith(letter)) || options[0];
      const draft = transition(state, { type: 'draft', event: node.id, option: option.id });
      assert.equal(draft.messages.length, state.messages.length, 'selection must not send');
      assert.deepEqual(restore(serialize(draft)), draft, 'draft survives reload');
      state = transition(draft, { type: 'send', event: node.id });
      assert.strictEqual(transition(state, { type: 'send', event: node.id }), state, 'duplicate submit ignored');
    } else state = transition(state, { type: 'advance', event: node.id });
    assert.deepEqual(restore(serialize(state)), state, 'every event can restore exactly');
  }
  assert.equal(state.conversationFinished, true);
  assert.equal(state.messages.at(-1).text, '拜拜');
  assert.deepEqual(state.messages.filter(m => m.sender === 'time').map(m => m.text), ['22:36', '23:18']);
  assert.equal(state.messages.some(m => m.text === '你刚刚不是说你今天也很累吗'), letter === 'A');
  assert.equal(Object.keys(state.selectedChoices).length, 11);
  return state;
}

test('all 33 choices, fixed replies, both memory routes, ending and every save cursor', () => {
  const visited = new Set();
  for (const letter of ['A', 'B', 'C']) play(letter, visited);
  const playable = Object.values(nodes).filter(n => !['jump', 'condition', 'end'].includes(n.type));
  assert.equal(playable.filter(n => !visited.has(n.id)).length, 0);
});

test('all 352 lines match approved source, including punctuation and duplicate lines', () => {
  const source = readFileSync('docs/dialogue-source.txt', 'utf8').split('## 第一段：在干嘛')[1].split('# 十三、结束方式')[0];
  const expected = [...source.matchAll(/^(用户|张函瑞)：\s*\n\s*([^\n]+)/gm)].map(m => `${m[1]}:${m[2]}`);
  const actual = Object.values(nodes).flatMap(n => n.type === 'reply' ? [`用户:${n.text}`] : n.type === 'message' ? [`张函瑞:${n.text}`] : (n.options || []).flatMap(o => o.messages.map(m => `用户:${m}`)));
  assert.equal(expected.length, 352);
  assert.deepEqual(actual.sort(), expected.sort());
});

test('Q7C sends exactly two bubbles and no combined label', () => {
  const state = play('C');
  const messages = state.messages.filter(m => m.id.startsWith('q7:'));
  assert.deepEqual(messages.map(m => m.text), ['说不上来', '反正就是不太一样了']);
});

test('invalid saves and unauthorized transitions fail safely', () => {
  for (const raw of ['garbage', '{}', JSON.stringify({ schemaVersion: 1, storyVersion: 1, ledger: [{ event: 'q11', option: '11A' }] })]) assert.throws(() => restore(raw));
  const state = initial();
  assert.strictEqual(transition(state, { type: 'send', event: state.currentNode }), state);
  const forged = JSON.parse(serialize(state));
  forged.userTired = true;
  forged.messages = [{ text: 'forged' }];
  assert.deepEqual(restore(JSON.stringify(forged)), state);
});

test('explicit pauses do not add a second message delay', () => {
  for (const node of Object.values(nodes)) {
    if (node.type === 'pause' && nodes[node.next].type === 'message') assert.equal(nodes[node.next].delay, 0);
  }
  assert.equal(nodes['start:1'].delay, 800);
  assert.ok(Object.values(nodes).some(n => n.type === 'pause' && n.delay === 5000));
  assert.equal(nodes['after11:0'].delay, 4000);
});
