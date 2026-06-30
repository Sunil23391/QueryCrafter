import importlib
import sys
import unittest
from types import SimpleNamespace

from services.api_connector import ApiConnector


class ApiConnectorTests(unittest.TestCase):
    def test_build_body_inserts_sql_query_into_json_payload(self):
        config = {
            "body_template": '{"query": "{{sql_statement}}"}'
        }
        connector = ApiConnector(config)

        payload = connector.build_body("SELECT * FROM users")

        self.assertEqual(payload, {"query": "SELECT * FROM users"})

    def test_build_schema_ddl_generates_table_definition_for_imported_rows(self):
        sys.modules.pop("app", None)
        sys.modules["ollama"] = SimpleNamespace(chat=lambda **kwargs: {"message": {"content": "{}"}})

        app_module = importlib.import_module("app")
        ddl = app_module._build_schema_ddl([
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
        ])

        self.assertEqual(ddl, "CREATE TABLE imported_data (id TEXT, name TEXT);")


if __name__ == "__main__":
    unittest.main()
