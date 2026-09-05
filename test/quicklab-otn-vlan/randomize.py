#!/usr/bin/env python3

import argparse
import json
import random
import string
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


NETINFRA_NS = "http://example.com/netinfra"
MAX_SRL_PORT = 32


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

    for left in range(1, args.roadms + 1):
        for right in range(left + 1, args.roadms + 1):
            left_port = roadm_ports[left]
            right_port = roadm_ports[right]
            roadm_ports[left] += 1
            roadm_ports[right] += 1
            span_km = rng.randint(args.min_span_km, args.max_span_km)
            optical_links.append((left, left_port, right, right_port, span_km, span_km * 5))
            topology_links.append(
                {"endpoints": [f"roadm-{left}:e1-{left_port}", f"roadm-{right}:e1-{right_port}"]}
            )

    attachment_pairs = [(left, right) for left in range(1, args.roadms) for right in range(left + 2, args.roadms + 1)]
    backbone_links = []
    for link_index, (first_router, second_router) in enumerate(router_pairs, start=1):
        left_roadm, right_roadm = rng.choice(attachment_pairs)
        left_router, right_router = first_router, second_router
        if rng.choice((False, True)):
            left_router, right_router = right_router, left_router

        left_router_port = router_ports[left_router]
        right_router_port = router_ports[right_router]
        left_roadm_port = roadm_ports[left_roadm]
        right_roadm_port = roadm_ports[right_roadm]
        router_ports[left_router] += 1
        router_ports[right_router] += 1
        roadm_ports[left_roadm] += 1
        roadm_ports[right_roadm] += 1

        intermediate = list(range(left_roadm + 1, right_roadm))
        selected_intermediate = [node for node in intermediate if rng.random() < 0.75]
        if not selected_intermediate:
            selected_intermediate = [rng.choice(intermediate)]

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
                "path": selected_intermediate,
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
    print(f"  {len(optical_links)} ROADM mesh links, spans {args.min_span_km}-{args.max_span_km} km")
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