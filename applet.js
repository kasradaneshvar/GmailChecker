// Gmail Checker Cinnamon Applet
// Developed by Nicolas LLOBERA <nllobera@gmail.com> from
// # the Gmail Notifier Cinnamon Applet by denisigo <denis@sigov.ru> [http://cinnamon-spices.linuxmint.com/applets/view/73]
// # the icons of the gmail-plasmoid project - [http://code.google.com/p/gmail-plasmoid]
// version: 1.1 (03-03-2013)
// License: GPLv3
// Copyright © 2013 Nicolas LLOBERA


const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Gettext = imports.gettext;
// for /usr/share/locale/xx/LC_MESSAGES/gnome-applets-3.0.mo file
Gettext.bindtextdomain("gnome-applets-3.0", "/usr/share/locale");
Gettext.textdomain("gnome-applets-3.0");
const _ = Gettext.gettext;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const AppletDirectory = imports.ui.appletManager.appletMeta["GmailChecker@LLOBERA"].path;
imports.searchPath.push(AppletDirectory);
const PopupMenuExtension = imports.popupImageLeftMenuItem;
const GmailFeeder = imports.gmailfeeder;
const Settings = imports.settings;

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
        this.onCredentialsChangedCalls = 0;
        
        this.checkFrequency = Settings.CheckFrequency * 60000; // 60 * 1000 : minuts to milliseconds
        
        this.Account = "";
        this.Password = "";
        this.CredentialsError = true;

        Applet.IconApplet.prototype._init.call(this, orientation);

        try {
            this.set_applet_icon_path(AppletDirectory + '/icons/NoEmail.svg');
          
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);
          
            this.createContextMenu();
            
            // needs to be before buildGmailFeeder because buildGmailFeeder may throw exceptions
            this.listenCredentialsChanges();
            
            this.buildGmailFeeder();
        }
        catch (e) {
            global.logError(AppletName + ": " + e);
            Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": " + e + "\"");
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    createContextMenu: function() {
        this.check_menu_item = new Applet.MenuItem("Check", "mail-receive"/*Gtk.STOCK_REFRESH*/, Lang.bind(this, function() {
            if(!this.CredentialsError)
                this.onTimerElasped();
            else
                Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": Unvalid credentials.\"");
        }));
        this._applet_context_menu.addMenuItem(this.check_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this.openGmail_menu_item = new Applet.MenuItem("Gmail", "internet-mail", function() {
            Main.Util.spawnCommandLine("xdg-open " + GmailUrl);
        });
        this._applet_context_menu.addMenuItem(this.openGmail_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this.setLoginAndPassword_menu_item = new Applet.MenuItem("Login & Pass", Gtk.STOCK_DIALOG_AUTHENTICATION, Lang.bind(this, function() {
            this.setLoginAndPassword();
        }));
        this._applet_context_menu.addMenuItem(this.setLoginAndPassword_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        this.help_menu_item = new Applet.MenuItem(_("Help"), Gtk.STOCK_HELP, function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/README.md");
        });
        this._applet_context_menu.addMenuItem(this.help_menu_item);
        
        this.about_menu_item = new Applet.MenuItem(_("About"), Gtk.STOCK_ABOUT,  function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/LICENSE.md");
        });
        this._applet_context_menu.addMenuItem(this.about_menu_item);
    },

    buildGmailFeeder: function() {
        this.getLoginAndPassword();
        
        if(!this.CredentialsError)
        {
            // As invalid Google accounts is not detected as an error by GmailFeeder
            // here is a test to check the syntax of the email.
            // The regular expression is not specific to Gmail account 
            // since it is possible to set up Gmail for your own domain.
            // The problem still persists with syntaxical valid but non existing email account (dudul@gmail.com)
            var regex = new RegExp("[a-zA-Z0-9_\.-]+@[a-zA-Z0-9_\.-]+");
            if (regex.test(this.Account)) {
                this.gf = new GmailFeeder.GmailFeeder({
                    'username' : this.Account,
                    'password' : this.Password,
                    'callbacks' : {
                        'onError' : Lang.bind(this, function(errorCode, errorMessage) { this.onError(errorCode, errorMessage) }),
                        'onChecked' : Lang.bind(this, function(params) { this.onChecked(params) })
                    }
                });

                // check after 2s
                this.updateTimer(2000);
            }
            else
                Util.spawnCommandLine("notify-send --icon=error \"'"+ this.Account + "' is not a correct email account (ex: name@gmail.com)\"");
        }
    },

    selectPythonBin: function() {
        let [res, out, err, status] = GLib.spawn_command_line_sync("python -V");
        var version = String(err).split(" ")[1][0];
        if (version == 2)
            return "python";
        else
            return "python2";
    },
  
    getLoginAndPassword: function () {
        let [res, out, err, status] = GLib.spawn_command_line_sync(
            this.selectPythonBin() + " " + AppletDirectory + "/GetLoginAndPassword.py");
        
        let code = String(out).split(" ")[0];
        if(code == "0")
        {
            this.Account = String(out).split(" ")[1];
            this.Password = String(out).split(" ")[2];
            this.CredentialsError = false;
        }
        else if(code == "1")
        {
            this.CredentialsError = true;
            Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": unable to get login and password from Gnome Keyring.\"");
        }
        else
        {
            this.CredentialsError = true;
            Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": error in GetLoginAndPassword.py\"");
            global.logError(AppletName + ": " + String(out).split(" ")[1]);
        }
    },
    
    setLoginAndPassword: function () {
        GLib.spawn_command_line_async(
            "gnome-terminal -x " + this.selectPythonBin() + " " + AppletDirectory + "/SetLoginAndPassword.py");
        // the call of gnome-terminal does not wait the end of gnome-terminal to continue
        // even in sync mode (because it is a window)
        // that is why there is no more code here, because there is no way to wait
        // the new credentils entered by the user
        // to bypass this problem the applet listen the mofifications of the /tmp/gmailchecker.tmp file
        // this file is modified after the user has entered the new credentials
        // this way the applet is able to know exactly when the new credentials are ready
    },
    
    listenCredentialsChanges: function() {
        let file = Gio.file_new_for_path("/tmp/gmailchecker.tmp");
        this._monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', Lang.bind(this, this.onCredentialsChanged));
    },
    
    onCredentialsChanged: function() {      
        // for 1 modification the onCredentialsChanged is called 3 times
        if (++this.onCredentialsChangedCalls > 2)
        {
            this.onCredentialsChangedCalls = 0;
            this.buildGmailFeeder();
        }
    },
    
    onError: function(errorCode, errorMessage) {        
        var message = "";
        switch (errorCode) {
            case 'authFailed':
                message = AppletName + ": authentication failed.";
                
                this.newEmailsCount = 0;
                this.menu.removeAll();
                
                var iconPath = AppletDirectory + "/icons/NoEmail.svg";
                if (this.__icon_name != iconPath)
                    this.set_applet_icon_path(iconPath);
                break;
                
            case 'feedReadFailed':
                message = AppletName + ": feed reading failed. " + errorMessage;
                break;
                
            case 'feedParseFailed':
                message = AppletName + ": feed parsing failed. " + errorMessage;
                break;
        }
        
        Util.spawnCommandLine("notify-send --icon=error \""+ message + "\"");
        this.set_applet_tooltip(message);
        global.logError(message);
    },
  
    onChecked: function(params) {
        if (params.count > 0) {        
            this.newEmailsCount = params.count;
            this.menu.removeAll();
            
            for (var i = 0; i < this.newEmailsCount && i < Settings.MaxDisplayEmails ; i++) {
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
        else {
            var iconPath = AppletDirectory + "/icons/NoEmail.svg";
            if (this.__icon_name != iconPath)
                this.set_applet_icon_path(iconPath);
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
