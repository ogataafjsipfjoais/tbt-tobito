import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class RankingAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.url = f'http://127.0.0.1:{port}/api/flight-ranking.php'
        cls.server = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(Path(__file__).resolve().parents[1])],
            env={**os.environ, 'TBT_RANKING_DATA_DIR': cls.temp.name}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                with urlopen(cls.url, timeout=1):
                    return
            except (URLError, OSError):
                time.sleep(0.05)
        cls.server.terminate()
        cls.server.wait()
        cls.temp.cleanup()
        raise RuntimeError('Ranking test server did not start')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.temp.cleanup()

    def request(self, payload=None, headers=None):
        data = None if payload is None else json.dumps(payload).encode()
        req = Request(self.url, data=data, headers=headers or {'Content-Type': 'application/json', 'X-TBT-Ranking': '1'})
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.load(response)
        except HTTPError as response:
            with response:
                return response.code, json.load(response)

    def test_shared_record_update_idempotence_and_private_storage(self):
        record = {'id': 'integration-flight', 'token': 'a' * 64, 'name': 'とび斗', 'distance': 1200, 'timeSec': 90}
        self.assertEqual(self.request(record)[0], 200)
        self.assertEqual(self.request(record)[0], 200)
        record['name'] = '別端末から見える名前'
        self.assertEqual(self.request(record)[0], 200)
        status, body = self.request()
        rows = [item for item in body['records'] if item['id'] == record['id']]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['name'], record['name'])
        self.assertNotIn('owner', rows[0])
        self.assertNotIn('token', rows[0])
        self.assertEqual(self.request({**record, 'token': 'b' * 64})[0], 409)
        self.assertEqual(self.request({**record, 'distance': 5000})[0], 409)
        saved = Path(self.temp.name, 'flight-ranking-store.php')
        self.assertTrue(saved.read_text().startswith('<?php http_response_code(404); exit; ?>'))
        self.assertEqual(subprocess.check_output(['php', str(saved)]), b'')

    def test_invalid_and_simple_cross_origin_posts_are_rejected(self):
        self.assertEqual(self.request({'distance': -1})[0], 422)
        self.assertEqual(self.request({'distance': 100}, {'Content-Type': 'application/json'})[0], 415)
        self.assertEqual(self.request({'id': 'bad', 'token': 'a' * 64, 'name': 'x', 'distance': '123', 'timeSec': 1})[0], 422)


if __name__ == '__main__':
    unittest.main()
