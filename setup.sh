#!/bin/bash
# setup script for 360 to run on the backend
echo "Setting up 360 backend environment..."
# check if nodejs is installed 
local isNodeInstalled=false

command -v node >/dev/null 2>&1 && isNodeInstalled=true

#installation function
install() {
    echo "Installing dependencies..."
    npm install < null
    echo "Dependencies installed successfully."
    echo "Setup complete. You can now run the 360 server. with npm start"
    echo "make sure you have forwarded the port 8000 to your router or use cf tunnels to expose it to the internet to use it"
}

if [ "$isNodeInstalled" = false ]; then
    echo "Node.js is not installed. it is required to run 360 server"
else
    echo "Node.js runtime found"
    install
fi