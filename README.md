GmailChecker
============

Gmail Checker uses Atom throw a feed reader to receive new emails alerts.
The Gmail Checker will light when you will receive new emails and show you the number of your unread emails.
Your unread emails are displayed as a menu when you click on the Gmail Checker icon.
The Gmail inbox is checked at a frequency of 5 minuts by default, but you can do a manual check : right-click on the Gmail Checker icon -> Check


SETTINGS
============

To configure the credentials : right-click on the Gmail Checker icon -> Login & Pass
A console will be displayed asking you your Gmail account and your password to store them in Gnome Keyring.
Then Gmail Checker will try to connect to Gmail with these credentials.
You can change your credentials this way at anytime.

Two other settings are available at the beginning of the applet.js file :
* The max number of emails displayed in the popup menu
* The mailbox checking frequency
You can change these settings by editing the applet.js file, then restart cinnamon to apply them.


SOFTWARE REQUIREMENTS
============

* Gnome Keyring
  Because Gmail Checker store the credentials into Gnome Keyring
  
* Python 2
* Python 2 bindings for Gnome Keyring
  Needed to access prgrammatically to Gnome Keyring
  
* Gnome-Terminal
  Used as a GUI to ask Gmail account and password


RELEASE
============

v1.1 - 03-03-2013
------------
Emails test allows every syntaxic valid emails (not only those from Gmail) since it is possible to set up Gmail for your own domain
Don't reload 'NoEmail' icon if it is already loaded

v1.0 - 18-02-2013
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
