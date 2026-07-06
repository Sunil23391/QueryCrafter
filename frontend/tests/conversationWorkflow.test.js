import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBlankConversationWorkspace,
  createConversationWorkspace,
  deriveWorkflowStage,
  ensureConversationWorkspace,
  resolveConversationTarget,
  upsertConversationWorkspace,
  WORKFLOW_STAGE,
} from '../src/context/conversationWorkflow.js';

test('deriveWorkflowStage keeps a brand-new conversation in schema mode', () => {
  assert.equal(deriveWorkflowStage('', null), WORKFLOW_STAGE.schema);
  assert.equal(deriveWorkflowStage('   ', null), WORKFLOW_STAGE.schema);
});

test('deriveWorkflowStage advances to api and ready when schema and api config exist', () => {
  assert.equal(deriveWorkflowStage('CREATE TABLE users(id INT);', null), WORKFLOW_STAGE.api);
  assert.equal(deriveWorkflowStage('CREATE TABLE users(id INT);', 'cfg-1'), WORKFLOW_STAGE.ready);
});

test('upsertConversationWorkspace creates a blank container for a new chat id', () => {
  const next = upsertConversationWorkspace({}, { id: 'conv-1', title: 'New chat' });

  assert.deepEqual(next['conv-1'], {
    conversationId: 'conv-1',
    schemaDraft: '',
    domainDraft: 'General',
    selectedApiConfigId: '',
    workflowStage: WORKFLOW_STAGE.schema,
  });
});

test('upsertConversationWorkspace hydrates schema and api config for an existing conversation', () => {
  const next = upsertConversationWorkspace(
    {},
    {
      id: 'conv-2',
      schema: 'CREATE TABLE users(id INT);',
      domain: 'Retail',
      api_config_id: 'cfg-9',
    },
  );

  assert.deepEqual(next['conv-2'], {
    conversationId: 'conv-2',
    schemaDraft: 'CREATE TABLE users(id INT);',
    domainDraft: 'Retail',
    selectedApiConfigId: 'cfg-9',
    workflowStage: WORKFLOW_STAGE.ready,
  });
});

test('ensureConversationWorkspace is idempotent for the same conversation id', () => {
  const original = {
    'conv-1': createBlankConversationWorkspace('conv-1'),
  };

  const next = ensureConversationWorkspace(original, 'conv-1');

  assert.equal(next, original);
});

test('resolveConversationTarget prefers the freshly created working chat id', () => {
  assert.equal(resolveConversationTarget('conv-new', 'conv-old'), 'conv-new');
  assert.equal(resolveConversationTarget(null, 'conv-old'), 'conv-old');
  assert.equal(resolveConversationTarget(null, null), null);
});

test('createConversationWorkspace falls back to empty values when fields are missing', () => {
  assert.deepEqual(createConversationWorkspace({ id: 'conv-3' }), {
    conversationId: 'conv-3',
    schemaDraft: '',
    domainDraft: 'General',
    selectedApiConfigId: '',
    workflowStage: WORKFLOW_STAGE.schema,
  });
});
