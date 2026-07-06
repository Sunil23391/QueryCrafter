describe('QueryCrafter new chat workflow', () => {
  it('creates a new chat, attaches schema, binds API config, and executes a generated query', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    const sessionIdHolder = { value: null };
    const conversationHolder = {
      value: null,
    };

    const apiConfig = {
      id: 'cfg-1',
      name: 'Orders API',
      endpoint: 'http://localhost:4228/orders',
      method: 'POST',
      headers: [],
      auth: { required: false, type: 'none' },
      body_template: '{"query":"{{query}}"}',
      response_format: 'json',
    };

    cy.intercept('GET', '/api-configs', {
      success: true,
      configs: [apiConfig],
    }).as('getApiConfigs');

    cy.intercept('POST', /\/sessions\/[^/]+\/conversations$/, (req) => {
      const match = req.url.match(/\/sessions\/([^/]+)\/conversations$/);
      sessionIdHolder.value = match ? match[1] : 'session-1';
      conversationHolder.value = {
        id: 'conv-new',
        session_id: sessionIdHolder.value,
        title: 'New chat',
        schema: '',
        domain: 'General',
        api_config_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_time: null,
        message_count: 0,
      };
      req.reply({
        success: true,
        conversation: conversationHolder.value,
      });
    }).as('createConversation');

    cy.intercept('GET', /\/sessions\/[^/]+$/, (req) => {
      req.reply({
        success: true,
        session: {
          id: sessionIdHolder.value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active_conversation_id: conversationHolder.value?.id || null,
          active_conversation: conversationHolder.value,
          conversations: conversationHolder.value ? [conversationHolder.value] : [],
        },
      });
    }).as('getSession');

    cy.intercept('POST', '/schema', (req) => {
      expect(req.body.conversation_id).to.eq('conv-new');
      conversationHolder.value = {
        ...conversationHolder.value,
        schema: req.body.schema,
        domain: req.body.domain,
        updated_at: new Date().toISOString(),
      };
      req.reply({
        success: true,
        session_id: sessionIdHolder.value,
        conversation_id: conversationHolder.value.id,
        conversation: conversationHolder.value,
        message: 'Schema loaded successfully.',
      });
    }).as('loadSchema');

    cy.intercept('PATCH', /\/sessions\/[^/]+\/conversations\/conv-new$/, (req) => {
      conversationHolder.value = {
        ...conversationHolder.value,
        title: req.body.title,
        schema: req.body.schema,
        domain: req.body.domain,
        api_config_id: req.body.api_config_id || null,
        updated_at: new Date().toISOString(),
      };
      req.reply({
        success: true,
        conversation: conversationHolder.value,
      });
    }).as('bindApi');

    cy.intercept('POST', '/chat', (req) => {
      expect(req.body.conversation_id).to.eq('conv-new');
      req.reply({
        success: true,
        session_id: sessionIdHolder.value,
        conversation_id: 'conv-new',
        attempts_used: 1,
        assistant: {
          sql_query: 'SELECT * FROM imported_data;',
          reasoning: 'Use the imported schema and API binding.',
        },
      });
    }).as('chat');

    cy.intercept('POST', '/api-configs/cfg-1/preview', (req) => {
      expect(req.body.query).to.eq('SELECT * FROM imported_data;');
      req.reply({
        success: true,
        format: 'json',
        preview: [{ id: 1, name: 'Alice' }],
      });
    }).as('preview');

    cy.wait('@getApiConfigs');
    cy.contains('button', 'New Chat').first().click();
    cy.wait('@createConversation');

    cy.get('#schema').clear().type('CREATE TABLE users(id INT, name TEXT);');
    cy.contains('button', 'Save Schema').click();
    cy.wait('@loadSchema');

    cy.get('select').contains('option', 'Orders API').parent().select('cfg-1');
    cy.wait('@bindApi');

    cy.get('#question').type('Show all users');
    cy.get('#sendBtn').click();
    cy.wait('@chat');

    cy.contains('Generated SQL').should('exist');
    cy.contains('button', 'Execute Query & Preview').click();
    cy.wait('@preview');
    cy.contains('Preview Result').should('exist');
    cy.contains('Alice').should('exist');
  });
});
