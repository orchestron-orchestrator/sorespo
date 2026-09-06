#!/usr/bin/env python3

import argparse
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from itertools import permutations


NETINFRA_NS = "http://example.com/netinfra"
LOSS_PATTERN = re.compile(r"([0-9.]+)% packet loss")
RTT_PATTERN = re.compile(
    r"rtt min/avg/max/mdev = ([0-9.]+)/([0-9.]+)/([0-9.]+)/[0-9.]+ ms"
)


@dataclass(frozen=True)
class Router:
    name: str
    container: str
    address: str


@dataclass(frozen=True)
class PingResult:
    source: str
    destination: str
    loss: float | None
    minimum: float | None
    average: float | None
    maximum: float | None
    error: str | None = None

    @property
    def passed(self):
        return self.error is None and self.loss == 0 and self.average is not None


def load_routers(path):
    root = ET.parse(path).getroot()
    routers = []
    for node in root.findall(f".//{{{NETINFRA_NS}}}router"):
        name = node.findtext(f"{{{NETINFRA_NS}}}name")
        router_id = node.findtext(f"{{{NETINFRA_NS}}}id")
        if name is None or router_id is None:
            raise ValueError("each router must have a name and id")
        routers.append(Router(name, name.lower(), f"10.0.0.{router_id}"))
    return routers


def parse_ping_output(source, destination, returncode, output):
    loss_match = LOSS_PATTERN.search(output)
    rtt_match = RTT_PATTERN.search(output)
    loss = float(loss_match.group(1)) if loss_match else None
    if returncode == 0 and rtt_match:
        minimum, average, maximum = map(float, rtt_match.groups())
        return PingResult(source, destination, loss, minimum, average, maximum)
    message = output.strip().splitlines()[-1] if output.strip() else "no statistics"
    return PingResult(source, destination, loss, None, None, None, message)


def ping(testenv, count, source, destination):
    command = [
        "docker",
        "exec",
        f"{testenv}-{source.container}",
        "sr_cli",
        f"ping -c {count} -I {source.address} network-instance default {destination.address}",
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    except OSError as error:
        return PingResult(source.name, destination.name, None, None, None, None, str(error))
    output = completed.stdout + completed.stderr
    return parse_ping_output(source.name, destination.name, completed.returncode, output)


def print_report(results):
    passed = [result for result in results if result.passed]
    failed = [result for result in results if not result.passed]
    total = len(results)
    print(f"Ping summary: {len(passed)}/{total} passed, {len(failed)} failed")
    if passed:
        print(
            "Latency min/avg/max: "
            f"{min(result.minimum for result in passed):.3f}/"
            f"{sum(result.average for result in passed) / len(passed):.3f}/"
            f"{max(result.maximum for result in passed):.3f} ms"
        )
    if failed:
        print("Failures:")
        for result in failed:
            detail = f"{result.loss:g}% loss" if result.loss is not None else result.error
            print(f"  {result.source} -> {result.destination}: {detail}")
    return bool(failed)


def main():
    parser = argparse.ArgumentParser(description="Run SR Linux loopback pings in parallel")
    parser.add_argument("netinfra")
    parser.add_argument("--testenv", required=True)
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--workers", type=int, default=32)
    args = parser.parse_args()
    if args.count < 1 or args.workers < 1:
        parser.error("count and workers must be positive")

    routers = load_routers(args.netinfra)
    directions = list(permutations(routers, 2))
    print(
        f"Running {len(directions)} directed pings across {len(routers)} routers "
        f"with {min(args.workers, len(directions))} workers...",
        flush=True,
    )
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        results = list(
            executor.map(lambda pair: ping(args.testenv, args.count, *pair), directions)
        )
    return print_report(results)


if __name__ == "__main__":
    sys.exit(main())