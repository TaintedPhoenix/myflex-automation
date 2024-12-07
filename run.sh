#!/bin/bash
echo "Installing dependencies..."
npm install
echo -e "\nStarting the program...\n"
npm start
read -p "Press any key to continue..."
exit 0