import unittest

import ping_test


class PingTestTests(unittest.TestCase):
    def test_parse_success(self):
        output = """3 packets transmitted, 3 received, 0% packet loss, time 2ms
rtt min/avg/max/mdev = 40.005/40.101/40.177/0.100 ms
"""
        result = ping_test.parse_ping_output("A-CORE", "B-CORE", 0, output)

        self.assertTrue(result.passed)
        self.assertEqual(result.loss, 0)
        self.assertEqual((result.minimum, result.average, result.maximum), (40.005, 40.101, 40.177))

    def test_parse_failure(self):
        output = "3 packets transmitted, 0 received, 100% packet loss, time 2ms\n"
        result = ping_test.parse_ping_output("A-CORE", "B-CORE", 1, output)

        self.assertFalse(result.passed)
        self.assertEqual(result.loss, 100)


if __name__ == "__main__":
    unittest.main()