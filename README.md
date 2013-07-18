GmailChecker
============

Gmail Checker uses Atom throw a feed reader to receive new emails alerts.  
The Gmail Checker will light when you will receive new emails and show you the number of your unread emails.  
Your unread emails are displayed as a menu when you click on the Gmail Checker icon.  
The Gmail inbox is checked at a frequency of 5 minuts by default, but you can modify the frequency in the settings.


SETTINGS
============

To access to the settings: right-click on the Gmail Checker icon -> Settings

Email account and password  
After having change your credentials, press on the "Set the email and password" button to apply your changes.


SOFTWARE REQUIREMENTS
============

* Gnome Keyring and libsecret (https://live.gnome.org/Libsecret)  
  If you want to store your password into Gnome Keyring


RELEASE
============

v2.1 - 19.07.2013
------------
The applet don't crash anymore if libsecret is not installed  
Allow to custom the OpenGmailCommand (the action when the Gmail menu/button is pressed)  
Use Gtk icons if the theme icons are not found  
Ignore Soup status code 6  
Change the keys in GMAILCHECKER_SCHEMA


v2.0 - 07.06.2013
------------
Add the new settings feature  
Move login and password to the settings (no more dependency to python and gnome-terminal)  
Storing the password in GnomeKeyring is an option  
Simplify the code of GmailFeeder  


v1.1 - 03.03.2013
------------
Emails test allows every syntaxic valid emails (not only those from Gmail) since it is possible to set up Gmail for your own domain  
Don't reload 'NoEmail' icon if it is already loaded

v1.0 - 18.02.2013
------------
First version  
Display an icon with the number of unread emails  
Unread emails display in menu items  
A way to manually check the Gmail inbox  
Gmail account password stored in Gnome Keyring


TODO
============

Important
------------
* Call Gnome Keyring methods directly from Gjs without Python  
  http://stackoverflow.com/questions/14920159/unable-to-create-a-garray-in-gjs  
  Another solution could to be use Vala to call Gnome Keyring methods, then to import the Vala library into Gjs
* Display error when an syntaxically valid Gmail account (name@gmail.com) tries to connect  
  but this account doesn't exit
* Use a window form to set or change the credentials instead of the console

Nice to have
------------
* Play a sound when new emails are found
* Use font style in the menu items
* Bigger context menu icons
* Better traduction file (*.mo/*.po)
