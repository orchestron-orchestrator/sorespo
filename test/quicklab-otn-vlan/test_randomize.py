import argparse
import random
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

import randomize


NS = {"netinfra": randomize.NETINFRA_NS}


def text(element, name):
    return element.findtext(f"netinfra:{name}", namespaces=NS)


class RandomTopologyTests(unittest.TestCase):
    def test_non_optimal_path_uses_loop_free_detour(self):
        edges = [
            (1, 2, 100),
            (2, 4, 100),
            (1, 3, 100),
            (3, 5, 100),
            (5, 4, 100),
        ]

        optimal = randomize.shortest_path(1, 4, edges)
        routed = randomize.non_optimal_path(1, 4, edges, random.Random(42))

        self.assertGreater(len(routed), len(optimal))
        self.assertEqual(len(routed), len(set(routed)))
        physical_edges = {frozenset((left, right)) for left, right, _ in edges}
        for left, right in zip(routed, routed[1:]):
            self.assertIn(frozenset((left, right)), physical_edges)

    def test_physical_graph_is_connected_sparse_and_geographic(self):
        for roadm_count in range(3, 21):
            for seed in range(10):
                coordinates = randomize.generate_roadm_coordinates(
                    roadm_count, 200, 500, random.Random(seed)
                )
                edges = randomize.build_optical_edges(
                    coordinates, 200, 500, random.Random(seed + 1000)
                )
                complete_edge_count = roadm_count * (roadm_count - 1) // 2
                self.assertGreaterEqual(len(edges), roadm_count - 1)
                self.assertLess(len(edges), complete_edge_count)
                self.assertTrue(all(200 <= span_km <= 500 for _, _, span_km in edges))
                for left, right, span_km in edges:
                    self.assertEqual(
                        span_km,
                        round(randomize.haversine_km(coordinates[left], coordinates[right])),
                    )

                reached = {1}
                while True:
                    neighbors = {
                        right if left in reached else left
                        for left, right, _ in edges
                        if (left in reached) != (right in reached)
                    }
                    if not neighbors:
                        break
                    reached.update(neighbors)
                self.assertEqual(reached, set(coordinates))

    def test_exact_span_range_remains_connected(self):
        for roadm_count in range(3, 10):
            coordinates = randomize.generate_roadm_coordinates(
                roadm_count, 200, 200, random.Random(roadm_count)
            )
            edges = randomize.build_optical_edges(
                coordinates, 200, 200, random.Random(roadm_count + 1000)
            )
            self.assertEqual(len(edges), roadm_count - 1)
            self.assertTrue(all(span_km == 200 for _, _, span_km in edges))

    def test_generated_paths_use_physical_links_and_edge_roadms(self):
        with tempfile.TemporaryDirectory() as directory:
            netinfra_path = Path(directory) / "netinfra.xml"
            topology_path = Path(directory) / "topology.json"
            randomize.generate(
                argparse.Namespace(
                    routers=4,
                    roadms=8,
                    backbone_links=4,
                    min_span_km=200,
                    max_span_km=500,
                    seed=12345,
                    netinfra=netinfra_path,
                    topology=topology_path,
                )
            )
            root = ET.parse(netinfra_path).getroot()
            coordinates = {
                int(text(roadm, "id")): (
                    float(text(roadm, "latitude")),
                    float(text(roadm, "longitude")),
                )
                for roadm in root.findall(".//netinfra:roadm", NS)
            }
            names = {f"ROADM-{index}": index for index in coordinates}
            edge_roadms = set(randomize.peripheral_roadms(coordinates))
            optical_links = root.findall(".//netinfra:optical-link", NS)
            physical_edges = {
                frozenset((text(link, "left-roadm"), text(link, "right-roadm")))
                for link in optical_links
            }
            physical_spans = [
                (
                    names[text(link, "left-roadm")],
                    names[text(link, "right-roadm")],
                    int(text(link, "latency")) // 5,
                )
                for link in optical_links
            ]
            router_sites = {}
            detour_found = False

            for link in root.findall(".//netinfra:backbone-link", NS):
                optical = link.find("netinfra:optical", NS)
                path = [
                    text(optical, "left-roadm"),
                    *(node.text for node in optical.findall("netinfra:otn-path", NS)),
                    text(optical, "right-roadm"),
                ]
                self.assertIn(names[path[0]], edge_roadms)
                self.assertIn(names[path[-1]], edge_roadms)
                self.assertEqual(len(path), len(set(path)))
                for left, right in zip(path, path[1:]):
                    self.assertIn(frozenset((left, right)), physical_edges)
                optimal = randomize.shortest_path(
                    names[path[0]], names[path[-1]], physical_spans
                )
                detour_found |= len(path) > len(optimal)
                for router_name, roadm_name in (
                    (text(link, "left-router"), path[0]),
                    (text(link, "right-router"), path[-1]),
                ):
                    self.assertEqual(router_sites.setdefault(router_name, roadm_name), roadm_name)

            self.assertTrue(detour_found)


if __name__ == "__main__":
    unittest.main()
