import unittest
from unittest.mock import patch

from app import app


class ApiRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_validate_endpoint_accepts_payload_without_config_id(self):
        with patch("app.ApiConnector.validate_connection", return_value={"success": True, "message": "ok"}):
            response = self.client.post(
                "/api-configs/validate",
                json={
                    "name": "menu",
                    "endpoint": "http://localhost:4228/menu",
                    "method": "POST",
                    "headers": "",
                    "body_template": '{"query": "SELECT * FROM menu"}',
                    "response_format": "auto",
                    "auth": {"required": False, "type": "none"}
                }
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])


if __name__ == "__main__":
    unittest.main()
