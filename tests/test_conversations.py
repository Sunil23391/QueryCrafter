import unittest
from unittest.mock import patch

from app import app, api_configs


class ConversationRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_create_new_chat_bootstraps_session_without_schema(self):
        session_id = 'session-cold-start'

        response = self.client.post(
            f'/sessions/{session_id}/conversations',
            json={'clone_from_active': False},
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        conversation = data['conversation']
        self.assertEqual(conversation['session_id'], session_id)
        self.assertEqual(conversation['schema'], '')
        self.assertIsNone(conversation['api_config_id'])

        session_response = self.client.get(f'/sessions/{session_id}')
        self.assertEqual(session_response.status_code, 200)
        session_data = session_response.get_json()['session']
        self.assertEqual(session_data['last_active_conversation_id'], conversation['id'])
        self.assertEqual(len(session_data['conversations']), 1)

    def test_create_switch_bind_and_chat_conversations(self):
        schema_response = self.client.post(
            '/schema',
            json={'schema': 'CREATE TABLE users(id INT);', 'domain': 'Retail'},
        )
        self.assertEqual(schema_response.status_code, 200)
        schema_data = schema_response.get_json()
        session_id = schema_data['session_id']

        second_response = self.client.post(
            f'/sessions/{session_id}/conversations',
            json={'clone_from_active': False},
        )
        self.assertEqual(second_response.status_code, 200)
        second_data = second_response.get_json()['conversation']
        self.assertEqual(second_data['schema'], '')
        self.assertIsNone(second_data['api_config_id'])

        switch_response = self.client.patch(
            f'/sessions/{session_id}',
            json={'active_conversation_id': second_data['id']},
        )
        self.assertEqual(switch_response.status_code, 200)

        api_configs['cfg-1'] = {
            'id': 'cfg-1',
            'name': 'Test API',
            'endpoint': 'http://localhost:4228/sql_query',
            'method': 'POST',
            'headers': [],
            'auth': {'required': False, 'type': 'none'},
            'body_template': '{"query":"{{query}}"}',
            'response_format': 'json',
        }

        bind_response = self.client.patch(
            f'/sessions/{session_id}/conversations/{second_data["id"]}',
            json={
                'title': 'Test bind',
                'schema': 'CREATE TABLE users(id INT);',
                'domain': 'Retail',
                'api_config_id': 'cfg-1',
            },
        )
        self.assertEqual(bind_response.status_code, 200)
        bound_conversation = bind_response.get_json()['conversation']
        self.assertEqual(bound_conversation['api_config_id'], 'cfg-1')

        with patch(
            'app.generate_sql_tool_call',
            return_value={
                'success': True,
                'assistant': {'sql_query': 'SELECT 1', 'reasoning': 'ok'},
                'attempts_used': 1,
            },
        ):
            chat_response = self.client.post(
                '/chat',
                json={
                    'session_id': session_id,
                    'conversation_id': second_data['id'],
                    'question': 'How many users?',
                },
            )

        self.assertEqual(chat_response.status_code, 200)
        chat_data = chat_response.get_json()
        self.assertTrue(chat_data['success'])
        self.assertEqual(chat_data['conversation_id'], second_data['id'])

        messages_response = self.client.get(f'/sessions/{session_id}/conversations/{second_data["id"]}/messages')
        self.assertEqual(messages_response.status_code, 200)
        messages = messages_response.get_json()['messages']
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]['role'], 'user')
        self.assertEqual(messages[1]['role'], 'assistant')

        history_response = self.client.get(f'/history/{session_id}')
        self.assertEqual(history_response.status_code, 200)
        self.assertEqual(len(history_response.get_json()['history']), 1)


if __name__ == '__main__':
    unittest.main()
