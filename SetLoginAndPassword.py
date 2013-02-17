#!/usr/bin/env python

import gnomekeyring as GnomeKeyring

username = raw_input('Enter Gmail login (name@gmail.com) > ')
password = raw_input('Enter password > ')


keyring = GnomeKeyring.get_default_keyring_sync() # login

# delete previous Gmail Checker entries
try:
    matches = GnomeKeyring.find_items_sync(
        GnomeKeyring.ITEM_GENERIC_SECRET, {"application" : "Gmail Checker"});
    for match in matches:
        GnomeKeyring.item_delete_sync(keyring, match.item_id)
except GnomeKeyring.NoMatchError:
    pass


GnomeKeyring.item_create_sync(
    keyring, GnomeKeyring.ITEM_GENERIC_SECRET, "Gmail Checker", 
    {"account" : username, "application" : "Gmail Checker"}, password, True)

print("Login and password stored in Gnome Keyring!")
