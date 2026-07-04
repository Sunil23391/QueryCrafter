import unittest
from unittest.mock import patch

from app import app


class ConversationRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_create_switch_and_chat_conversations(self):
        schema_response = self.client.post(
            '/schema',
            json={'schema': 'CREATE TABLE users(id INT);', 'domain': 'Retail'},
        )
        self.assertEqual(schema_response.status_code, 200)
        schema_data = schema_response.get_json()
        session_id = schema_data['session_id']
        conversation_id = schema_data['conversation_id']

        second_response = self.client.post(
            f'/sessions/{session_id}/conversations',
            json={'clone_from_active': True, 'schema': 'CREATE TABLE users(id INT);', 'domain': 'Retail'},
        )
        self.assertEqual(second_response.status_code, 200)
        second_data = second_response.get_json()['conversation']

        switch_response = self.client.patch(
            f'/sessions/{session_id}',
            json={'active_conversation_id': second_data['id']},
        )
        self.assertEqual(switch_response.status_code, 200)

        with patch('app.generate_sql_tool_call', return_value={'success': True, 'assistant': {'sql_query': 'SELECT 1', 'reasoning': 'ok'}, 'attempts_used': 1}):
            chat_response = self.client.post(
                '/chat',
                json={'session_id': session_id, 'conversation_id': second_data['id'], 'question': 'How many users?'},
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
