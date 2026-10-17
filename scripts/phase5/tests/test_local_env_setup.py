import base64
import json
import unittest
from scripts.phase5.configure_local_env import parse_status


def fake_jwt(role):
    payload = base64.urlsafe_b64encode(json.dumps({'role':role}).encode()).decode().rstrip('=')
    return f'header.{payload}.signature'


class TestPublicEnvironment(unittest.TestCase):
    def test_public_publishable_only(self):
        url,key = parse_status('API_URL=http://127.0.0.1:54321\nPUBLISHABLE_KEY=sb_publishable_localtest\nSECRET_KEY=sb_secret_fake\n')
        self.assertEqual(url, 'http://127.0.0.1:54321')
        self.assertEqual(key, 'sb_publishable_localtest')
    def test_legacy_anon_supported(self):
        url,key = parse_status('API_URL=http://localhost:54321\nANON_KEY='+fake_jwt('anon')+'\n')
        self.assertTrue(key.startswith('header.'))
    def test_service_role_never_saved(self):
        with self.assertRaises(ValueError): parse_status('API_URL=http://localhost:54321\nANON_KEY='+fake_jwt('service_role'))
    def test_reject_nonlocal_url(self):
        with self.assertRaises(ValueError): parse_status('API_URL=http://myVM:54321\nPUBLISHABLE_KEY=sb_publishable_demo')
    def test_no_accidental_secret_fallback(self):
        with self.assertRaises(ValueError): parse_status('API_URL=http://localhost:54321\nSECRET_KEY=sb_secret_fake')

if __name__ == '__main__':
    unittest.main()
