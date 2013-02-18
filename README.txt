DESCRIPTION
========
Gmail Checker uses Atom throw a feed reader to receive new emails alerts.
The Gmail Checker will light when you will receive new emails and show you the number of your unread emails.
Your unread emails are displayed as a menu when you click on the Gmail Checker icon.


SETTINGS
========
To configure the credentials : right-click on Gmail Checker -> Login & Pass
A console will be displayed asking you your Gmail account and your password to store them in Gnome Keyring.
Then Gmail Checker will try to connect to Gmail with these credentials.
You can change your credentials this way at anytime.

Two other settings are available at the beginning of the applet.js file :
# The max number of emails displayed in the popup menu
# The mailbox checking frequency
You can change these settings by editing the applet.js file, then restart cinnamon to apply them.


SOFTWARE REQUIREMENTS
========
# Gnome Keyring
  Because Gmail Checker store the credentials into Gnome Keyring
  
# Python 2
# Python 2 bindings for Gnome Keyring
  Needed to access prgrammatically to Gnome Keyring
  
# Gnome-Terminal
  Used as a GUI to ask Gmail account and password
