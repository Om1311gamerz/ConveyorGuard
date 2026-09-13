import unittest
from inference_utils import detection_packet


class InferencePacketTests(unittest.TestCase):
    def test_file_results_never_claim_camera_or_encoder_position(self):
        packet = detection_packet("crack", 0.73, [10, 20, 110, 120], (480, 640), "FILE", "fixture", {"source": "ESP32", "positionValid": True, "beltPositionMeters": 1, "completedBeltCycles": 5})
        self.assertEqual(packet["confidence"], 73)
        self.assertIsNone(packet["beltPosition"])
        self.assertEqual(packet["source"], "FILE")

    def test_camera_ignores_stale_or_simulated_encoder(self):
        for belt in [{"source": "ESP32", "positionValid": False}, {"source": "SIMULATOR", "positionValid": True}]:
            packet = detection_packet("scratch", 0.8, [1, 2, 10, 12], (480, 640), "CAMERA", "fixture", belt)
            self.assertIsNone(packet["positionSource"])

    def test_reverse_encoder_cycle_is_preserved(self):
        packet = detection_packet("crack", 0.8, [1, 2, 10, 12], (480, 640), "CAMERA", "fixture", {"source": "ESP32", "positionValid": True, "beltPositionMeters": 1.84, "completedBeltCycles": -1})
        self.assertEqual(packet["cycle"], -1)
        self.assertEqual(packet["positionSource"], "ESP32")


if __name__ == "__main__":
    unittest.main()
