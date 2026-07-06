import json
from unittest.mock import patch

import pytest

from app import app


@pytest.fixture
def client():
    return app.test_client()


def test_full_conversation_pipeline(client):
    session_id = 'test-session-1'

    # 1) Create conversation
    resp = client.post(f'/sessions/{session_id}/conversations', json={'clone_from_active': False, 'schema': '', 'domain': 'General'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    conversation = data['conversation']
    conv_id = conversation['id']

    # 2) Attach schema
    schema_sql = 'CREATE TABLE users(id INT, name TEXT);'
    resp = client.post('/schema', json={'session_id': session_id, 'conversation_id': conv_id, 'schema': schema_sql, 'domain': 'General'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['conversation']['schema'] == schema_sql

    # 3) Configure API (bind)
    resp = client.patch(f'/sessions/{session_id}/conversations/{conv_id}', json={'api_config_id': 'cfg-1', 'title': 'New chat', 'schema': schema_sql, 'domain': 'General'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['conversation']['api_config_id'] == 'cfg-1'

    # 4) Send message -> patch generate_sql_tool_call to avoid external Ollama
    fake_result = {
        'success': True,
        'assistant': {'sql_query': 'SELECT * FROM users;', 'reasoning': 'test'},
        'attempts_used': 1,
    }

    with patch('ai_engine.generate_sql_tool_call', return_value=fake_result):
        resp = client.post('/chat', json={'session_id': session_id, 'conversation_id': conv_id, 'question': 'Show users'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert data['assistant']['sql_query'] == 'SELECT * FROM users;'

    # 5) Ensure conversation now has messages
    resp = client.get(f'/sessions/{session_id}/conversations/{conv_id}/messages')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert len(data['messages']) >= 1
