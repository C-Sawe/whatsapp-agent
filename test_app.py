import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, send_whatsapp_message, process_message, activity_logs
import config_manager
import sheets_handler

class TestConfigManager(unittest.TestCase):
    def setUp(self):
        self.test_env_file = ".test_env"
        config_manager.ENV_FILE = self.test_env_file
        if os.path.exists(self.test_env_file):
            os.remove(self.test_env_file)

    def tearDown(self):
        if os.path.exists(self.test_env_file):
            os.remove(self.test_env_file)
        config_manager.ENV_FILE = ".env"

    def test_get_and_update_env_vars(self):
        self.assertEqual(config_manager.get_env_vars(), {})

        new_vars = {
            "WHATSAPP_TOKEN": "test_token_123",
            "VERIFY_TOKEN": "test_verify_abc",
            "SPREADSHEET_ID": "sheet_999"
        }
        config_manager.update_env_vars(new_vars)

        read_vars = config_manager.get_env_vars()
        self.assertEqual(read_vars["WHATSAPP_TOKEN"], "test_token_123")
        self.assertEqual(read_vars["VERIFY_TOKEN"], "test_verify_abc")
        self.assertEqual(read_vars["SPREADSHEET_ID"], "sheet_999")
        self.assertEqual(os.environ.get("WHATSAPP_TOKEN"), "test_token_123")


class TestSheetsHandler(unittest.TestCase):
    @patch("sheets_handler.get_sheet")
    def test_lookup_inventory_found(self, mock_get_sheet):
        mock_sheet = MagicMock()
        mock_sheet.get_all_records.return_value = [
            {"Product": "Laptop", "Price": "$999", "Stock": 15},
            {"Product": "Mouse", "Price": "$25", "Stock": 50},
        ]
        mock_get_sheet.return_value = mock_sheet

        result = sheets_handler.lookup_inventory("mouse")
        self.assertIn("Product: Mouse", result)
        self.assertIn("Price: $25", result)
        self.assertIn("Stock: 50", result)

    @patch("sheets_handler.get_sheet")
    def test_lookup_inventory_not_found(self, mock_get_sheet):
        mock_sheet = MagicMock()
        mock_sheet.get_all_records.return_value = [
            {"Product": "Laptop", "Price": "$999", "Stock": 15},
        ]
        mock_get_sheet.return_value = mock_sheet

        result = sheets_handler.lookup_inventory("Keyboard")
        self.assertIn("couldn't find any product matching 'Keyboard'", result)

    @patch("sheets_handler.get_sheet")
    def test_lookup_inventory_no_sheet_connection(self, mock_get_sheet):
        mock_get_sheet.return_value = None
        result = sheets_handler.lookup_inventory("Laptop")
        self.assertEqual(result, "Internal Error: Could not connect to the inventory database.")

    @patch("os.path.exists", return_value=True)
    @patch.dict(os.environ, {"SPREADSHEET_ID": "sheet123", "GOOGLE_APPLICATION_CREDENTIALS": "service_account.json"})
    @patch("sheets_handler.get_sheet")
    def test_test_sheet_connection_success(self, mock_get_sheet, mock_exists):
        mock_sheet = MagicMock()
        mock_sheet.get_all_records.return_value = [{"A": 1}, {"B": 2}]
        mock_get_sheet.return_value = mock_sheet

        status = sheets_handler.test_sheet_connection()
        self.assertTrue(status["success"])
        self.assertEqual(status["count"], 2)


class TestAuthenticationAndProtectedDashboard(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_unauthenticated_redirect(self):
        response = self.client.get("/overview", follow_redirects=False)
        self.assertEqual(response.status_code, 303)
        self.assertIn("/login", response.headers["location"])

        response = self.client.get("/credentials", follow_redirects=False)
        self.assertEqual(response.status_code, 303)
        self.assertIn("/login", response.headers["location"])

    def test_login_flow(self):
        # 1. Get login page
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Admin Login", response.text)

        # 2. Submit wrong password
        response = self.client.post("/login", data={"username": "admin", "password": "wrongpassword"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Invalid username or password", response.text)

        # 3. Submit valid credentials
        response = self.client.post("/login", data={"username": "admin", "password": "admin123"}, follow_redirects=False)
        self.assertEqual(response.status_code, 303)
        self.assertIn("/overview", response.headers["location"])

    def test_authenticated_dashboard_pages(self):
        # Authenticate
        self.client.post("/login", data={"username": "admin", "password": "admin123"})

        # Overview
        res = self.client.get("/overview")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Overview & Quick Controls", res.text)

        # Credentials page
        res = self.client.get("/credentials")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Meta WhatsApp & Google Credentials", res.text)

        # Inventory page
        res = self.client.get("/inventory")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Live Inventory Tester", res.text)

        # Logs page
        res = self.client.get("/logs")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Incoming Webhook Activity Logs", res.text)

    def test_logout_flow(self):
        self.client.post("/login", data={"username": "admin", "password": "admin123"})
        res = self.client.get("/logout", follow_redirects=False)
        self.assertEqual(res.status_code, 303)
        self.assertIn("/login", res.headers["location"])

        # Subsequent protected route access should redirect to /login
        res2 = self.client.get("/overview", follow_redirects=False)
        self.assertEqual(res2.status_code, 303)
        self.assertIn("/login", res2.headers["location"])


class TestFastAPIWebhooks(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch.dict(os.environ, {"VERIFY_TOKEN": "my_secret_token"})
    def test_verify_webhook_success(self):
        response = self.client.get("/webhook", params={
            "hub.mode": "subscribe",
            "hub.verify_token": "my_secret_token",
            "hub.challenge": "challenge_code_12345"
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "challenge_code_12345")

    @patch("main.process_message")
    def test_webhook_post_text_message(self, mock_process_message):
        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "from": "123456789",
                                        "type": "text",
                                        "text": {"body": "Laptop"}
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        response = self.client.post("/webhook", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "success"})
        mock_process_message.assert_called_once_with("123456789", "Laptop")


if __name__ == "__main__":
    unittest.main()
