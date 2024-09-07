#!/bin/bash

#   _______  _______  _______  _        _______  _______  _______  _______   
#  (  ___  )(  ____ )(  ____ \( (    /|(  ___  )(  ____ \(  ___  )(  ____ )  
#  | (   ) || (    )|| (    \/|  \  ( || (   ) || (    \/| (   ) || (    )|  
#  | |   | || (____)|| (__    |   \ | || (___) || (_____ | (___) || (____)|  
#  | |   | ||  _____)|  __)   | (\ \) ||  ___  |(_____  )|  ___  ||     __)  
#  | |   | || (      | (      | | \   || (   ) |      ) || (   ) || (\ (     
#  | (___) || )      | (____/\| )  \  || )   ( |/\____) || )   ( || ) \ \__  
#  (_______)|/       (_______/|/    )_)|/     \|\_______)|/     \||/   \__/  
#
#  Installation Script for Linux.
#
#  Main program: 
#  Checks for the existance of several common directories that Discord installs itself into.
#  If one is found, it `cd`s into it, alerts user of incoming sudo prompt, and hands over to oAsarInstall.
#
#  oAsarInstall:
#  If no current installation of OpenAsar is found (indicated by the abscence of an "app.asar.bak" file),
#  the script renames the current "app.asar" to "app.asar.bak", then downloads OpenAsar from
#  the nightly GitHub page (via wget) into the current working directory.
#  A sudo prompt will appear to place OpenAsar into the directory.
#  If a current installation of OpenAsar DOES exist, the script will replace it.


oAsarInstall()
{
   echo 

   if [ -a "app.asar.bak" ]; then
     sudo rm app.asar
   fi

   sudo mv app.asar app.asar.bak
   sudo wget --no-verbose https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar
   echo
   echo "OpenAsar has been installed! If Discord is still running, restart it."
   exit 0
}

echo "Checking file directories..."
echo
#Find which directory Discord is installed in. If it exists, move to oAsarInstall
if [ -d "/opt/discord/resources/" ]; then
   cd /opt/discord/resources/

   echo "Found Discord installation in /opt/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall
else
   echo "/opt/discord/resources/ not found"
fi

if [ -d "/usr/lib/discord/resources/" ]; then
   cd /usr/lib/discord/resources/

   echo "Found Discord installation in /usr/lib/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall
else
   echo "/usr/lib/discord/resources/ not found"
fi

if [ -d "/usr/lib64/discord/resources/" ]; then
   cd /usr/lib64/discord/resources/

   echo "Found Discord installation in /usr/lib64/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall
else
   echo "/usr/lib64/discord/resources/ not found"
fi

if [ -d "/usr/share/discord/resources/" ]; then
   cd /usr/share/discord/resources/

   echo "Found Discord installation in /usr/share/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall
else
   echo "/usr/share/discord/resources/ not found"
fi

if [ -d "/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/" ]; then
   cd /var/lib/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/

   echo "Found Discord installation in /var/lib/flatpak/app/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall
else
   echo "/var/lib/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/ dosen't exist"
fi

if [ -d "$HOME/.local/share/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/" ]; then
   cd "$HOME/.local/share/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/"

   echo "Found Discord installation in ~/.local/share/flatpak/app/. You will now see a sudo prompt to download and install OpenAsar."
   oAsarInstall 
else
   echo "$HOME/.local/share/flatpak/app/com.discordapp.Discord/current/active/files/discord/resources/ not found"
fi

if [ -d "/snap/discord/current/usr/share/discord/resources/" ]; then
   cd /snap/discord/current/usr/share/discord/resources/
   
   echo
   echo "Found Discord installation in Snap, but Snap packages are read-only. Consider using Flatpak or your distribution's native installation option."
   
   exit 2
fi

#None of the directory searches are successful
echo "No Discord directories were found. Exiting..."
exit 1
