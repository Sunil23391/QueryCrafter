import csv
import json
import re
from io import StringIO
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
import requests


class UnsupportedFormatError(Exception):
    pass


class ApiResponseParser:
    """Parse API responses for supported formats."""

    @staticmethod
    def detect_format(content_type: Optional[str], content: str) -> str:
        if content_type:
            lower = content_type.lower()
            if "json" in lower:
                return "json"
            if "csv" in lower:
                return "csv"

        stripped = content.lstrip()
        if stripped.startswith("[") or stripped.startswith("{"):
            return "json"
        if "," in stripped and "\n" in stripped:
            return "csv"
        raise UnsupportedFormatError("Unsupported response format")

    @staticmethod
    def parse(content_type: Optional[str], content: str, preferred: Optional[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        if preferred in (None, "", "auto"):
            fmt = ApiResponseParser.detect_format(content_type, content)
        else:
            fmt = preferred

        if fmt == "json":
            return ApiResponseParser._parse_json(content)
        if fmt == "csv":
            return ApiResponseParser._parse_csv(content)
        raise UnsupportedFormatError(f"Unsupported response format: {fmt}")

    @staticmethod
    def _parse_json(content: str) -> Tuple[str, List[Dict[str, Any]]]:
        data = json.loads(content)
        if isinstance(data, list):
            rows = [item for item in data if isinstance(item, dict)]
            if not rows:
                return "json", []
            return "json", rows

        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], list):
                rows = [item for item in data["data"] if isinstance(item, dict)]
                return "json", rows
            if "results" in data and isinstance(data["results"], list):
                rows = [item for item in data["results"] if isinstance(item, dict)]
                return "json", rows
            return "json", [data]

        raise UnsupportedFormatError("JSON response must be an array of objects or a dictionary")

    @staticmethod
    def _parse_csv(content: str) -> Tuple[str, List[Dict[str, Any]]]:
        reader = csv.DictReader(StringIO(content))
        if not reader.fieldnames:
            raise UnsupportedFormatError("CSV response must include headers")
        rows = []
        for row in reader:
            rows.append({key: value for key, value in row.items() if key is not None})
        return "csv", rows


class ApiConnector:
    """Execute API requests and return parsed rows."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def build_headers(self) -> Dict[str, str]:
        headers = {}
        for item in self.config.get("headers", []) or []:
            key = item.get("key", "").strip()
            value = item.get("value", "").strip()
            if key:
                headers[key] = value
        auth = self.config.get("auth", {})
        auth_type = auth.get("type")
        if auth_type == "bearer":
            token = auth.get("token", "").strip()
            if token:
                headers["Authorization"] = f"Bearer {token}"
        elif auth_type == "api_key":
            key_name = auth.get("key_name", "").strip()
            key_value = auth.get("key_value", "").strip()
            if key_name and key_value:
                headers[key_name] = key_value
        elif auth_type == "basic":
            username = auth.get("username", "").strip()
            password = auth.get("password", "").strip()
            if username or password:
                import base64
                token = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers["Authorization"] = f"Basic {token}"
        return headers

    def build_body(self, sql_query: str) -> Dict[str, str]:
        return {"query": sql_query}

    def validate_connection(self) -> Dict[str, Any]:
        method = self.config.get("method", "GET").upper()
        endpoint = self.config.get("endpoint", "").strip()
        if not endpoint:
            return {"success": False, "error": "Endpoint URL is required."}

        try:
            urlparse(endpoint)
        except Exception:
            return {"success": False, "error": "Endpoint URL is invalid."}

        try:
            response = requests.request(
                method=method,
                url=endpoint,
                headers=self.build_headers(),
                json=self.build_body("SELECT 1"),
                timeout=10,
            )
            response.raise_for_status()
            return {"success": True, "message": "API connection is reachable."}
        except requests.exceptions.RequestException as exc:
            return {"success": False, "error": str(exc)}

    def execute(self, sql_query: str) -> Dict[str, Any]:
        method = self.config.get("method", "GET").upper()
        endpoint = self.config.get("endpoint", "").strip()
        if not endpoint:
            return {"success": False, "error": "Endpoint URL is required."}

        try:
            response = requests.request(
                method=method,
                url=endpoint,
                headers=self.build_headers(),
                json=self.build_body(sql_query),
                timeout=20,
            )
            response.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            return {"success": False, "error": f"HTTP error: {exc}"}
        except requests.exceptions.RequestException as exc:
            return {"success": False, "error": f"Request failed: {exc}"}

        content_type = response.headers.get("Content-Type", "")
        try:
            fmt, rows = ApiResponseParser.parse(content_type, response.text, self.config.get("response_format"))
        except UnsupportedFormatError as exc:
            return {"success": False, "error": str(exc)}

        if not rows:
            return {"success": False, "error": "No records were returned by the API."}

        return {
            "success": True,
            "format": fmt,
            "rows": rows,
            "preview": rows[:5]
        }
