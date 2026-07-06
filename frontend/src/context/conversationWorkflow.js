export const WORKFLOW_STAGE = {
  schema: 'schema',
  api: 'api',
  ready: 'ready',
};

export const deriveWorkflowStage = (schema = '', apiConfigId = null) => {
  const hasSchema = Boolean((schema || '').trim());
  const hasApi = Boolean(apiConfigId);

  if (!hasSchema) return WORKFLOW_STAGE.schema;
  return hasApi ? WORKFLOW_STAGE.ready : WORKFLOW_STAGE.api;
};

export const createBlankConversationWorkspace = (conversationId = null) => ({
  conversationId,
  schemaDraft: '',
  domainDraft: 'General',
  selectedApiConfigId: '',
  workflowStage: WORKFLOW_STAGE.schema,
});

export const createConversationWorkspace = (conversation = {}) => ({
  conversationId: conversation.id || null,
  schemaDraft: conversation.schema || '',
  domainDraft: conversation.domain || 'General',
  selectedApiConfigId: conversation.api_config_id || '',
  workflowStage: deriveWorkflowStage(conversation.schema, conversation.api_config_id),
});

export const upsertConversationWorkspace = (workspaces = {}, conversation = {}) => {
  if (!conversation.id) return workspaces;

  const existing = workspaces[conversation.id] || createBlankConversationWorkspace(conversation.id);
  return {
    ...workspaces,
    [conversation.id]: {
      ...existing,
      ...createConversationWorkspace(conversation),
      conversationId: conversation.id,
    },
  };
};

export const ensureConversationWorkspace = (workspaces = {}, conversationId) => {
  if (!conversationId) return workspaces;
  if (workspaces[conversationId]) return workspaces;

  return {
    ...workspaces,
    [conversationId]: createBlankConversationWorkspace(conversationId),
  };
};

export const resolveConversationTarget = (workingConversationId, activeConversationId) =>
  workingConversationId || activeConversationId || null;
