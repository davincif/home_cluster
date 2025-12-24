#!/usr/bin/env bash
# Source this file to export SPBarrier SSH targets as environment variables.

# If executed instead of sourced, explain and return a non-zero exit code.
# shellcheck disable=SC2091
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "This file must be sourced, not executed:"
  echo "  source ~/.spbarriers.env.sh"
  exit 2
fi

# Edit these targets to match your network.
# Use either: "host", "ip", or "user@host" / "user@ip".
export PI01_wlan="192.168.1.141"
export PI01_eth="192.168.1.150"

export PI02_wlan="192.168.1.142"
export PI02_eth="192.168.1.155"

export PI03_wlan="192.168.1.145"
export PI03_eth="192.168.1.153"
