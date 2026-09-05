#!/usr/bin/env python3

import argparse
import heapq
import json
import math
import random
import string
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


NETINFRA_NS = "http://example.com/netinfra"
MAX_SRL_PORT = 32
EARTH_RADIUS_KM = 6371.0088


def child(parent, name, value=None):
    element = ET.SubElement(parent, name)
    if value is not None:
        element.text = str(value)
    return element


def write_atomic(path, content):
    path = Path(path)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as output:
        output.write(content)
        temporary_path = Path(output.name)
    temporary_path.replace(path)


def parse_netinfra(path):
    return ET.parse(path).getroot()


def elements(root, name):
    return root.findall(f".//{{{NETINFRA_NS}}}{name}")


def element_text(element, name):
    return element.findtext(f"{{{NETINFRA_NS}}}{name}")


def print_router_nodes(path):
    root = parse_netinfra(path)
    names = [element_text(node, "name").lower() for node in elements(root, "router")]
    names.extend(element_text(node, "name").lower() for node in elements(root, "roadm"))
    print(" ".join(names))


def print_backbone_interfaces(path):
    root = parse_netinfra(path)
    interfaces = []
    for link in elements(root, "backbone-link"):
        interfaces.append(f"{element_text(link, 'left-router').lower()}:{element_text(link, 'left-interface')}")
        interfaces.append(f"{element_text(link, 'right-router').lower()}:{element_text(link, 'right-interface')}")
    print(" ".join(interfaces))


def validate_counts(router_count, roadm_count, backbone_link_count):
    if not 2 <= router_count <= len(string.ascii_uppercase):
        raise ValueError("ROUTERS must be between 2 and 26")
    if roadm_count < 3:
        raise ValueError("ROADMS must be at least 3 to produce suboptimal paths")
    if roadm_count >= MAX_SRL_PORT:
        raise ValueError(f"ROADMS must be less than {MAX_SRL_PORT}")
    if backbone_link_count < 1:
        raise ValueError("BACKBONE_LINKS must be at least 1")


def select_router_pairs(router_count, backbone_link_count, rng):
    if backbone_link_count < router_count - 1:
        raise ValueError(
            f"BACKBONE_LINKS must be at least {router_count - 1} to connect {router_count} routers"
        )

    by_subnet = {}
    for left in range(1, router_count + 1):
        for right in range(left + 1, router_count + 1):
            by_subnet.setdefault(left + right, []).append((left, right))

    if backbone_link_count > len(by_subnet):
        raise ValueError(
            f"BACKBONE_LINKS cannot exceed {len(by_subnet)} for {router_count} routers "
            "because the current address model requires a unique router-letter sum per link"
        )

    center = rng.randint(1, router_count)
    selected = [tuple(sorted((center, other))) for other in range(1, router_count + 1) if other != center]
    rng.shuffle(selected)
    used_subnets = {left + right for left, right in selected}

    extra_by_subnet = {
        subnet_id: [pair for pair in pairs if pair not in selected]
        for subnet_id, pairs in by_subnet.items()
        if subnet_id not in used_subnets
    }
    extra_subnets = list(extra_by_subnet)
    rng.shuffle(extra_subnets)
    for subnet_id in extra_subnets[:backbone_link_count - len(selected)]:
        selected.append(rng.choice(extra_by_subnet[subnet_id]))
    return selected


def haversine_km(left, right):
    left_latitude, left_longitude = map(math.radians, left)
    right_latitude, right_longitude = map(math.radians, right)
    latitude_delta = right_latitude - left_latitude
    longitude_delta = right_longitude - left_longitude
    chord = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(left_latitude) * math.cos(right_latitude) * math.sin(longitude_delta / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(chord))


def destination_coordinate(origin, bearing, distance_km):
    latitude, longitude = map(math.radians, origin)
    angular_distance = distance_km / EARTH_RADIUS_KM
    destination_latitude = math.asin(
        math.sin(latitude) * math.cos(angular_distance)
        + math.cos(latitude) * math.sin(angular_distance) * math.cos(bearing)
    )
    destination_longitude = longitude + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(latitude),
        math.cos(angular_distance) - math.sin(latitude) * math.sin(destination_latitude),
    )
    normalized_longitude = (math.degrees(destination_longitude) + 180) % 360 - 180
    return round(math.degrees(destination_latitude), 6), round(normalized_longitude, 6)


def generate_roadm_coordinates(roadm_count, min_span_km, max_span_km, rng):
    columns = math.ceil(math.sqrt(roadm_count))
    rows = math.ceil(roadm_count / columns)
    spacing_km = (min_span_km + max_span_km) / 2
    jitter_km = min(
        spacing_km * 0.08,
        max(0, spacing_km - min_span_km) / 4,
        max(0, max_span_km - spacing_km) / 4,
    )
    rotation = rng.uniform(-math.pi, math.pi)
    center_latitude = rng.uniform(47.0, 55.0)
    center_longitude = rng.uniform(3.0, 15.0)
    if max_span_km - min_span_km <= max(2, spacing_km * 0.02):
        return {
            index: destination_coordinate(
                (center_latitude, center_longitude),
                rotation if offset >= 0 else rotation + math.pi,
                abs(offset) * spacing_km,
            )
            for index in range(1, roadm_count + 1)
            for offset in [index - (roadm_count + 1) / 2]
        }

    planar_points = {}

    for index in range(1, roadm_count + 1):
        row, column = divmod(index - 1, columns)
        x = (column - (columns - 1) / 2) * spacing_km + rng.uniform(-jitter_km, jitter_km)
        y = (row - (rows - 1) / 2) * spacing_km + rng.uniform(-jitter_km, jitter_km)
        planar_points[index] = (
            x * math.cos(rotation) - y * math.sin(rotation),
            x * math.sin(rotation) + y * math.cos(rotation),
        )

    mean_x = sum(point[0] for point in planar_points.values()) / roadm_count
    mean_y = sum(point[1] for point in planar_points.values()) / roadm_count
    coordinates = {}
    for index, (x, y) in planar_points.items():
        x -= mean_x
        y -= mean_y
        latitude = center_latitude + y / 110.574
        longitude = center_longitude + x / (111.320 * math.cos(math.radians(center_latitude)))
        coordinates[index] = (round(latitude, 6), round(longitude, 6))
    return coordinates


def projected_points(coordinates):
    center_latitude = sum(latitude for latitude, _ in coordinates.values()) / len(coordinates)
    longitude_scale = math.cos(math.radians(center_latitude))
    return {
        index: (longitude * longitude_scale, latitude)
        for index, (latitude, longitude) in coordinates.items()
    }


def segments_cross(first, second, points):
    first_left, first_right = first
    second_left, second_right = second
    if len({first_left, first_right, second_left, second_right}) < 4:
        return False

    def orientation(start, end, point):
        return (end[0] - start[0]) * (point[1] - start[1]) - (end[1] - start[1]) * (point[0] - start[0])

    a, b = points[first_left], points[first_right]
    c, d = points[second_left], points[second_right]
    return orientation(a, b, c) * orientation(a, b, d) < 0 and orientation(c, d, a) * orientation(c, d, b) < 0


def build_optical_edges(coordinates, min_span_km, max_span_km, rng):
    candidates = []
    for left in coordinates:
        for right in range(left + 1, len(coordinates) + 1):
            span_km = round(haversine_km(coordinates[left], coordinates[right]))
            if min_span_km <= span_km <= max_span_km:
                candidates.append((span_km, rng.random(), left, right))
    candidates.sort()

    parents = {index: index for index in coordinates}

    def find(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    selected = []
    selected_pairs = set()
    for span_km, _, left, right in candidates:
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            continue
        parents[left_root] = right_root
        selected.append((left, right, span_km))
        selected_pairs.add((left, right))
        if len(selected) == len(coordinates) - 1:
            break

    if len(selected) != len(coordinates) - 1:
        raise ValueError("unable to connect ROADMs within the requested span range")

    points = projected_points(coordinates)
    degrees = {index: 0 for index in coordinates}
    for left, right, _ in selected:
        degrees[left] += 1
        degrees[right] += 1

    complete_edge_count = len(coordinates) * (len(coordinates) - 1) // 2
    extra_target = min(
        max(1, len(coordinates) // 2),
        max(0, complete_edge_count - len(selected) - 1),
    )
    if extra_target == 0:
        return selected
    for span_km, _, left, right in candidates:
        pair = (left, right)
        if pair in selected_pairs or degrees[left] >= 4 or degrees[right] >= 4:
            continue
        if any(segments_cross(pair, (edge_left, edge_right), points) for edge_left, edge_right, _ in selected):
            continue
        selected.append((left, right, span_km))
        selected_pairs.add(pair)
        degrees[left] += 1
        degrees[right] += 1
        if len(selected) >= len(coordinates) - 1 + extra_target:
            break
    return selected


def peripheral_roadms(coordinates):
    points = projected_points(coordinates)
    ordered = sorted((x, y, index) for index, (x, y) in points.items())

    def cross(origin, left, right):
        return (left[0] - origin[0]) * (right[1] - origin[1]) - (left[1] - origin[1]) * (right[0] - origin[0])

    lower = []
    for point in ordered:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)
    upper = []
    for point in reversed(ordered):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    return [point[2] for point in lower[:-1] + upper[:-1]]


def shortest_path(start, end, edges):
    adjacency = {}
    for left, right, span_km in edges:
        adjacency.setdefault(left, []).append((right, span_km))
        adjacency.setdefault(right, []).append((left, span_km))
    queue = [(0, start, [])]
    visited = set()
    while queue:
        distance, node, path = heapq.heappop(queue)
        if node in visited:
            continue
        path = [*path, node]
        if node == end:
            return path
        visited.add(node)
        for neighbor, span_km in adjacency.get(node, []):
            if neighbor not in visited:
                heapq.heappush(queue, (distance + span_km, neighbor, path))
    raise ValueError(f"no optical path between ROADM-{start} and ROADM-{end}")


def non_optimal_path(start, end, edges, rng):
    optimal_path = shortest_path(start, end, edges)
    adjacency = {node: [] for edge in edges for node in edge[:2]}
    for left, right, _ in edges:
        adjacency[left].append(right)
        adjacency[right].append(left)

    path = [start]
    visited = {start}

    def find_detour(node):
        neighbors = list(adjacency[node])
        rng.shuffle(neighbors)
        neighbors.sort(key=lambda neighbor: neighbor == end)
        for neighbor in neighbors:
            if neighbor in visited:
                continue
            if neighbor == end:
                if len(path) + 1 > len(optimal_path):
                    return [*path, end]
                continue
            visited.add(neighbor)
            path.append(neighbor)
            detour = find_detour(neighbor)
            if detour is not None:
                return detour
            path.pop()
            visited.remove(neighbor)
        return None

    return find_detour(start) or optimal_path


def generate(args):
    validate_counts(args.routers, args.roadms, args.backbone_links)
    if args.min_span_km < 1 or args.max_span_km < args.min_span_km:
        raise ValueError("span distance must satisfy 1 <= MIN_SPAN_KM <= MAX_SPAN_KM")

    seed = args.seed if args.seed is not None else random.SystemRandom().randrange(2**63)
    rng = random.Random(seed)
    router_pairs = select_router_pairs(args.routers, args.backbone_links, rng)

    router_names = {index: f"{string.ascii_uppercase[index - 1]}-CORE" for index in range(1, args.routers + 1)}
    roadm_names = {index: f"ROADM-{index}" for index in range(1, args.roadms + 1)}
    router_ports = {index: 1 for index in router_names}
    roadm_ports = {index: 1 for index in roadm_names}
    topology_links = []
    optical_links = []
    coordinates = generate_roadm_coordinates(args.roadms, args.min_span_km, args.max_span_km, rng)
    physical_edges = build_optical_edges(coordinates, args.min_span_km, args.max_span_km, rng)
    for left, right, span_km in physical_edges:
        left_port = roadm_ports[left]
        right_port = roadm_ports[right]
        roadm_ports[left] += 1
        roadm_ports[right] += 1
        optical_links.append((left, left_port, right, right_port, span_km, span_km * 5))
        topology_links.append(
            {"endpoints": [f"roadm-{left}:e1-{left_port}", f"roadm-{right}:e1-{right_port}"]}
        )

    edge_roadms = peripheral_roadms(coordinates)
    router_roadms = {
        router: edge_roadms[((router - 1) * len(edge_roadms)) // args.routers]
        for router in router_names
    }
    backbone_links = []
    for link_index, (first_router, second_router) in enumerate(router_pairs, start=1):
        left_router, right_router = first_router, second_router
        if rng.choice((False, True)):
            left_router, right_router = right_router, left_router
        left_roadm = router_roadms[left_router]
        right_roadm = router_roadms[right_router]
        if left_roadm == right_roadm:
            candidates = [roadm for roadm in edge_roadms if roadm != left_roadm]
            right_roadm = max(candidates, key=lambda roadm: haversine_km(coordinates[left_roadm], coordinates[roadm]))

        left_router_port = router_ports[left_router]
        right_router_port = router_ports[right_router]
        left_roadm_port = roadm_ports[left_roadm]
        right_roadm_port = roadm_ports[right_roadm]
        router_ports[left_router] += 1
        router_ports[right_router] += 1
        roadm_ports[left_roadm] += 1
        roadm_ports[right_roadm] += 1

        routed_roadms = non_optimal_path(left_roadm, right_roadm, physical_edges, rng)

        topology_links.extend(
            [
                {"endpoints": [f"{router_names[left_router].lower()}:e1-{left_router_port}", f"roadm-{left_roadm}:e1-{left_roadm_port}"]},
                {"endpoints": [f"roadm-{right_roadm}:e1-{right_roadm_port}", f"{router_names[right_router].lower()}:e1-{right_router_port}"]},
            ]
        )
        backbone_links.append(
            {
                "left_router": left_router,
                "left_router_port": left_router_port,
                "right_router": right_router,
                "right_router_port": right_router_port,
                "left_roadm": left_roadm,
                "left_roadm_port": left_roadm_port,
                "right_roadm": right_roadm,
                "right_roadm_port": right_roadm_port,
                "path": routed_roadms[1:-1],
                "vlan": 99 + link_index,
            }
        )

    highest_port = max(max(router_ports.values()) - 1, max(roadm_ports.values()) - 1)
    if highest_port > MAX_SRL_PORT:
        raise ValueError(
            f"generated topology needs ethernet-1/{highest_port}; reduce counts so no node exceeds ethernet-1/{MAX_SRL_PORT}"
        )

    data = ET.Element("data")
    netinfra = child(data, "netinfra")
    netinfra.set("xmlns", NETINFRA_NS)
    global_settings = child(netinfra, "global-settings")
    child(global_settings, "ibgp-authentication-key", "ibgp-authentication-key")

    for index, name in router_names.items():
        router = child(netinfra, "router")
        child(router, "name", name)
        child(router, "id", index)
        child(router, "type", "NokiaSRLinux_25_3_2")
        child(router, "role", "edge")
        child(router, "asn", 65001)

    for index, name in roadm_names.items():
        roadm = child(netinfra, "roadm")
        child(roadm, "name", name)
        child(roadm, "id", index)
        child(roadm, "latitude", f"{coordinates[index][0]:.6f}")
        child(roadm, "longitude", f"{coordinates[index][1]:.6f}")

    for link in backbone_links:
        backbone = child(netinfra, "backbone-link")
        child(backbone, "left-router", router_names[link["left_router"]])
        child(backbone, "left-interface", f"ethernet-1/{link['left_router_port']}")
        child(backbone, "right-router", router_names[link["right_router"]])
        child(backbone, "right-interface", f"ethernet-1/{link['right_router_port']}")
        optical = child(backbone, "optical")
        child(optical, "vlan", link["vlan"])
        child(optical, "left-roadm", roadm_names[link["left_roadm"]])
        child(optical, "left-port", f"ethernet-1/{link['left_roadm_port']}")
        child(optical, "right-roadm", roadm_names[link["right_roadm"]])
        child(optical, "right-port", f"ethernet-1/{link['right_roadm_port']}")
        for roadm_index in link["path"]:
            child(optical, "otn-path", roadm_names[roadm_index])

    for left, left_port, right, right_port, span_km, latency_us in optical_links:
        optical = child(netinfra, "optical-link")
        child(optical, "left-roadm", roadm_names[left])
        child(optical, "left-port", f"ethernet-1/{left_port}")
        child(optical, "right-roadm", roadm_names[right])
        child(optical, "right-port", f"ethernet-1/{right_port}")
        optical.append(ET.Comment(f" {span_km} km of fiber at approximately 5 us/km. "))
        child(optical, "latency", latency_us)

    ET.indent(data, space="    ")
    xml_content = ET.tostring(data, encoding="unicode", xml_declaration=True) + "\n"

    nodes = {}
    for name in router_names.values():
        nodes[name.lower()] = {"kind": "nokia_srlinux"}
    for index in roadm_names:
        nodes[f"roadm-{index}"] = {"kind": "nokia_srlinux"}
    nodes["sweave"] = {
        "kind": "linux",
        "image": "sorespo-sweave-base",
        "image-pull-policy": "if-not-present",
        "ports": ["80/tcp", "830/tcp"],
    }
    nodes["webui"] = {
        "kind": "linux",
        "image": "${WEBUI_IMAGE}",
        "image-pull-policy": "if-not-present",
        "env": {"STRATOWEAVE_API_ORIGIN": "http://sweave:80"},
        "ports": ["127.0.0.1:${WEBUI_PORT}:3000/tcp"],
    }
    topology = {
        "name": "sorespo-quicklab-otn-vlan",
        "prefix": "__lab-name",
        "mgmt": {
            "network": "sorespo-quicklab-otn-vlan",
            "ipv4-subnet": "auto",
            "ipv6-subnet": "auto",
        },
        "topology": {
            "kinds": {
                "nokia_srlinux": {
                    "image": "ghcr.io/nokia/srlinux:25.3.2",
                    "image-pull-policy": "if-not-present",
                    "startup-config": "srl-startup.conf",
                }
            },
            "nodes": nodes,
            "links": topology_links,
        },
    }

    write_atomic(args.netinfra, xml_content)
    write_atomic(args.topology, json.dumps(topology, indent=2) + "\n")

    print(f"Randomized topology (seed {seed}):")
    print(f"  {args.routers} routers, {args.roadms} ROADMs, {args.backbone_links} backbone links")
    print(f"  {len(optical_links)} sparse ROADM links, spans {args.min_span_km}-{args.max_span_km} km")
    for link in backbone_links:
        path = [link["left_roadm"], *link["path"], link["right_roadm"]]
        print(
            f"  {router_names[link['left_router']]} -> {router_names[link['right_router']]}: "
            + " -> ".join(roadm_names[index] for index in path)
        )


def main():
    parser = argparse.ArgumentParser(description="Generate a randomized OTN Containerlab topology and netinfra input")
    subparsers = parser.add_subparsers(dest="command", required=True)

    generate_parser = subparsers.add_parser("generate")
    generate_parser.add_argument("--routers", type=int, required=True)
    generate_parser.add_argument("--roadms", type=int, required=True)
    generate_parser.add_argument("--backbone-links", type=int, required=True)
    generate_parser.add_argument("--seed", type=int)
    generate_parser.add_argument("--min-span-km", type=int, default=200)
    generate_parser.add_argument("--max-span-km", type=int, default=500)
    generate_parser.add_argument("--netinfra", default="netinfra.xml")
    generate_parser.add_argument("--topology", default="quicklab-otn-vlan.clab.yml")

    router_nodes_parser = subparsers.add_parser("router-nodes")
    router_nodes_parser.add_argument("netinfra")
    backbone_interfaces_parser = subparsers.add_parser("backbone-interfaces")
    backbone_interfaces_parser.add_argument("netinfra")

    args = parser.parse_args()
    try:
        if args.command == "generate":
            generate(args)
        elif args.command == "router-nodes":
            print_router_nodes(args.netinfra)
        else:
            print_backbone_interfaces(args.netinfra)
    except (OSError, ET.ParseError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()