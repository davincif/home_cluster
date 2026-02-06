# Source this file to export SPBarrier SSH targets as environment variables.

# If executed instead of sourced, show a hint and stop.
# In fish, `status --is-interactive` isn't a perfect "sourced vs executed" detector,
# but `status filename` is only meaningful when sourced.
if test (status filename) = ""
  echo "This file must be sourced, not executed:"
  echo "  source ./scripts/spbarriers.env.fish"
  exit 2
end



set -gx PI01_wlan "192.168.1.141"
set -gx PI01_eth "192.168.1.150"

set -gx PI02_wlan "192.168.1.142"
set -gx PI02_eth "192.168.1.155"

set -gx PI03_wlan "192.168.1.145"
set -gx PI03_eth "192.168.1.153"

set -gx PI04_wlan "192.168.1.157"
set -gx PI04_eth "192.168.1.159"