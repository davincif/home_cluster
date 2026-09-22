_start() {
  sudo upsdrvctl stop
  sudo upsdrvctl start
  sudo systemctl restart nut-server nut-client

  # Test the connection directly
  upsc eaton5e@localhost
}

_install() {
  sudo apt install nut nut-client libusb-1.0-0-dev nut-cgi apache2
  sudo systemctl restart apache2
  sudo a2enmod cgi
}
