#!/usr/bin/env python

#### Settings ####
username="name@gmail.com"
password="pass1234"
##################

import gnomekeyring as GnomeKeyring

keyring = GnomeKeyring.get_default_keyring_sync() # login

GnomeKeyring.item_create_sync(
    keyring, GnomeKeyring.ITEM_GENERIC_SECRET, "GMail Checker", 
    {"account" : username, "application" : "GMail Checker"}, password, True)
