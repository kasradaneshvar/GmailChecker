// Gmail Checker Cinnamon Applet
// Developed by Nicolas LLOBERA <nllobera@gmail.com>
// from the Gmail Notifier Cinnamon Applet by denisigo <denis@sigov.ru> [http://cinnamon-spices.linuxmint.com/applets/view/73]
// version: 1.0 (15-02-2013)
// License: GPLv3
// Copyright © 2013 Nicolas LLOBERA

/***** SETTINGS *****/
// Max number of emails displayed in the popup menu
const MaxDisplayEmails = 4;
// Mailbox checking frequency, in minuts
const CheckFrequency = 5;
/********************/


const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Gettext = imports.gettext;
// for /usr/share/locale/xx/LC_MESSAGES/gnome-applets-3.0.mo file
Gettext.bindtextdomain("gnome-applets-3.0", "/usr/share/locale");
Gettext.textdomain("gnome-applets-3.0");
const _ = Gettext.gettext;

const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const AppletDirectory = imports.ui.appletManager.appletMeta["gmailnotifier@denisigo"].path;
imports.searchPath.push(AppletDirectory);
const PopupMenuExtension = imports.popupImageLeftMenuItem;
const GmailFeeder = imports.gmailfeeder;

const AppletName = "Gmail Checker";
const GmailUrl = "https://mail.google.com";

function MyApplet(orientation) {
  this._init(orientation);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {
        this._chkMailTimerId = 0;
        this.newEmailsCount = 0;
        
        this.checkFrequency = CheckFrequency * 60000; // 60 * 1000 : minuts to milliseconds
        
        this.Account = "";
        this.Password = "";

        Applet.IconApplet.prototype._init.call(this, orientation);
        
        var this_ = this;

        try {
            this.set_applet_icon_path(AppletDirectory + '/icons/NoEmail.svg');
          
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);
          
            this.createContextMenu();
            
            this.getLoginAndPassword();

            this.gf = new GmailFeeder.GmailFeeder({
                'username' : this.Account,
                'password' : this.Password,
                'callbacks' : {
                    'onError' : function(errorCode, errorMessage) { this_.onError(errorCode, errorMessage) },
                    'onChecked' : function(params) { this_.onChecked(params) }
                }
            });

            // check after 5s
            this.updateTimer(5000);
        }
        catch (e) {
            global.logError(AppletName + " : " + e);
            Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": " + e + "\"");
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    createContextMenu: function () {
        var this_ = this;
        
        this.check_menu_item = new Applet.MenuItem("Check", "mail-receive"/*Gtk.STOCK_REFRESH*/, function() {
            this_.onTimerElasped();
        });
        this._applet_context_menu.addMenuItem(this.check_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this.check_menu_item = new Applet.MenuItem("Gmail", "internet-mail", function() {
            Main.Util.spawnCommandLine("xdg-open " + GmailUrl);
        });
        this._applet_context_menu.addMenuItem(this.check_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this.help_menu_item = new Applet.MenuItem(_("Help"), Gtk.STOCK_HELP, function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/README.txt");
        });
        this._applet_context_menu.addMenuItem(this.help_menu_item);
        
        this.about_menu_item = new Applet.MenuItem(_("About"), Gtk.STOCK_ABOUT,  function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/ABOUT.txt");
        });
        this._applet_context_menu.addMenuItem(this.about_menu_item);
    },
  
    getLoginAndPassword: function () {
        // test python python2
        var pythonBin = "python2";
        // test GetLoginAndPassword.py
        var GetLoginAndPasswordFile = "GetLoginAndPassword.py";
        
        let [res, out, err, status] = GLib.spawn_command_line_sync(pythonBin + " " + AppletDirectory + "/" + GetLoginAndPasswordFile);

        this.Account = String(out).split(" ")[0];
        this.Password = String(out).split(" ")[1];
    },
    
    onError: function(errorCode, errorMessage) {
        switch (errorCode) {
            case 'authFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \""+ AppletName + ": authentication failed\"");
                this.set_applet_tooltip(AppletName + ": authentication failed");
                break;
            case 'feedReadFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \""+ AppletName + ": feed reading failed\"");
                this.set_applet_tooltip(AppletName + ": feed reading failed");
                break;
            case 'feedParseFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \"" + AppletName + ": feed parsing failed\"");
                this.set_applet_tooltip(AppletName + ": feed parsing failed");
                break;
        }
        
        global.logError(AppletName + ": " + errorMessage);
    },
  
    onChecked: function(params) {
        if (params.count > 0) {        
            // absNewMailsCount : real new emails since the last time onGfNewMail was launched
            var absNewMailsCount = params.count - this.newEmailsCount;
            this.newEmailsCount = params.count;
            
            // absNewMailsCount = 0 : no real new email since the last time -> nothing else to do
            // absNewMailsCount > 0 : new fresh emails since the last time -> rebuild
            // absNewMailsCount < 0 : at least one of the new email has been read -> rebuild
            // REMARK : problem if 1 new email arrived and 1 new email was read, 
            // the absNewMailsCount stay at 0 and the rebuild is not launched
            if (absNewMailsCount != 0) {
                this.menu.removeAll();
                for (var i = 0; i < this.newEmailsCount && i < MaxDisplayEmails ; i++) {
                    var message = params.messages[i];
                    
                    if (i > 0) this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                    
                    var menuItem = new PopupMenuExtension.PopupImageLeftMenuItem(
                        _("From:") + " " + message.authorName + "\r\n" + 
                        message.title + "\r\n\r\n" + message.summary + "\r\n...", 
                        "mail-read", 
                        message.id == null ? 
                        "xdg-open " + GmailUrl :
                        "xdg-open " + GmailUrl + "/mail/#inbox/" + message.id);
                    
                    menuItem.connect("activate", function(actor, event) { Util.spawnCommandLine(actor.command); });
                    this.menu.addMenuItem(menuItem);
                }

                this.set_applet_tooltip('You have ' + this.newEmailsCount + ' new mails.');
                
                var iconName = this.newEmailsCount > 9 ? "+" : this.newEmailsCount;
                var iconPath = AppletDirectory + "/icons/" + iconName + ".svg";
                if (this.__icon_name != iconPath)
                    this.set_applet_icon_path(iconPath);
            }
        }
        else {
            this.set_applet_icon_path(AppletDirectory + '/icons/NoEmail.svg');
            this.set_applet_tooltip("You don't have new emails.");
            this.newEmailsCount = 0;
            this.menu.removeAll();
        }
    },
  
    updateTimer: function(timeout) {
        if (this._chkMailTimerId) {
            Mainloop.source_remove(this._chkMailTimerId);
            this._chkMailTimerId = 0;
        }
        if (timeout > 0)
            this._chkMailTimerId = Mainloop.timeout_add(timeout, Lang.bind(this, this.onTimerElasped));
    },

    onTimerElasped: function() {
        this.gf.check();
        this.updateTimer(this.checkFrequency);
    }
};

function main(metadata, orientation) {
    let myApplet = new MyApplet(orientation);
    return myApplet;
}
