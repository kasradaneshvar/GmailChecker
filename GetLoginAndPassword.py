#!/usr/bin/env python

import gnomekeyring as GnomeKeyring

keyring = GnomeKeyring.get_default_keyring_sync() # login

try:
    matches = GnomeKeyring.find_items_sync(
        GnomeKeyring.ITEM_GENERIC_SECRET, {"application" : "GMail Checker"});
    for match in matches:
        print("%s %s" % (match.attributes["account"], match.secret))
except:
    print("null null")
