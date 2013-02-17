#!/usr/bin/env python

import gnomekeyring as GnomeKeyring

username = raw_input('Enter Gmail login (name@gmail.com) > ')
password = raw_input('Enter password > ')


keyring = GnomeKeyring.get_default_keyring_sync() # login

GnomeKeyring.item_create_sync(
    keyring, GnomeKeyring.ITEM_GENERIC_SECRET, "GMail Checker", 
    {"account" : username, "application" : "GMail Checker"}, password, True)

print("Login and password stored in Gnome Keyring!")
