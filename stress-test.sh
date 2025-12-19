# https://github.com/nschloe/stressberry

watch -n1 'echo -n "temp(C): "; awk "{print \$1/1000}" /sys/class/thermal/thermal_zone0/temp'
stress-ng --cpu 4 --timeout 10m --metrics-brief | tee ~/stress_logs/cpu_10m.txt
