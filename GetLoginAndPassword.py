#!/usr/bin/env python

import gnomekeyring as GnomeKeyring

try:
    matches = GnomeKeyring.find_items_sync(
        GnomeKeyring.ITEM_GENERIC_SECRET, {"application" : "Gmail Checker"});
    for match in matches:
        print("0 %s %s" % (match.attributes["account"], match.secret))

except GnomeKeyring.NoMatchError:
    print "1 null null"

except Exception as e:
    print "2 " + str(e)
