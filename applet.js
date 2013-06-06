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
const Secret = imports.gi.Secret;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Util = imports.misc.util;

const AppletName = "Gmail Checker";
const GmailUrl = "https://mail.google.com";
const appletUUID = 'GmailChecker@LLOBERA';

const GMAILCHECKER_SCHEMA = new Secret.Schema(
    "org.gnome.Application.Password",
    Secret.SchemaFlags.NONE,
    {
        "string": Secret.SchemaAttributeType.STRING,
        "string": Secret.SchemaAttributeType.STRING
    }
);

const AppletDirectory = imports.ui.appletManager.appletMeta[appletUUID].path;
imports.searchPath.push(AppletDirectory);
const PopupMenuExtension = imports.popupImageLeftMenuItem;
const GmailFeeder = imports.gmailfeeder;


function MyApplet(metadata, orientation, panel_height, instanceId) {
    this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instanceId) {
        this._chkMailTimerId = 0;
        this.newEmailsCount = 0;

        Applet.IconApplet.prototype._init.call(this, orientation);

        try {
            this.set_applet_icon_path(AppletDirectory + '/icons/NoEmail.svg');
          
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager.addMenu(this.menu);
          
            this.settings = new Settings.AppletSettings(this, appletUUID, instanceId);
            this.bindSettings();
          
            this.createContextMenu();
            
            this.emailAccount = this.newEmailAccount;
            this.getPassword();
            
            if (this.checkCrendentials())
                this.buildGmailFeeder();
            else {
                Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": Unvalid credentials\"");
                Util.trySpawnCommandLine("cinnamon-settings applets " + appletUUID);
            }
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
        let check_menu_item = new Applet.MenuItem("Check", "mail-receive"/*Gtk.STOCK_REFRESH*/, Lang.bind(this, function() {
            if (this.checkCrendentials())
                this.onTimerElasped();
            else
                Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": Unvalid credentials.\"");
        }));
        this._applet_context_menu.addMenuItem(check_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let openGmail_menu_item = new Applet.MenuItem("Gmail", "internet-mail", function() {
            Main.Util.spawnCommandLine("xdg-open " + GmailUrl);
        });
        this._applet_context_menu.addMenuItem(openGmail_menu_item);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let settingsItem = new Applet.MenuItem(_("Settings"), Gtk.STOCK_EDIT, function() {
            Util.trySpawnCommandLine("cinnamon-settings applets " + appletUUID);
        });
        this._applet_context_menu.addMenuItem(settingsItem);
        
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        let help_menu_item = new Applet.MenuItem(_("Help"), Gtk.STOCK_HELP, function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/README.md");
        });
        this._applet_context_menu.addMenuItem(help_menu_item);
        
        let about_menu_item = new Applet.MenuItem(_("About"), Gtk.STOCK_ABOUT,  function() {
            Main.Util.spawnCommandLine("xdg-open " + AppletDirectory + "/LICENSE.md");
        });
        this._applet_context_menu.addMenuItem(about_menu_item);
    },

    bindSettings: function() {
        this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
            "EmailAccount", "newEmailAccount", this.on_email_changed, null);
            
        this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
            "Password", "newPassword", this.on_password_changed, null);
        
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "MaxDisplayEmails", "maxDisplayEmails", this.on_settings_changed, null);
            
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "CheckFrequency", "checkFrequency", this.on_settings_changed, null);
    },
    
    on_settings_changed: function() {
    },
    
    on_email_changed: function() {
        global.log("on_email_changed: " + this.newEmailAccount + " | " + this.emailAccount);
        // due to a bug in cinnamon applet all the binding functions are called even if the setting wasn't changed
        if (this.newEmailAccount && this.newEmailAccount != this.emailAccount) {
            // As invalid Google accounts is not detected as an error by GmailFeeder
            // here is a test to check the email syntax.
            // The regular expression is not specific to Gmail account 
            // since it is possible to set up Gmail for your own domain.
            // The problem still persists with syntaxical valid but non existing email account (dudul@gmail.com)
            var regex = new RegExp("[a-zA-Z0-9_\.-]+@[a-zA-Z0-9_\.-]+");
            if (regex.test(this.newEmailAccount)) {
                this.emailAccount = this.newEmailAccount;
                this.buildGmailFeeder();
            }
            else {
                this.newEmailAccount = this.emailAccount; // reset the incorrect email account
                Util.spawnCommandLine("notify-send --icon=error \"'"+ this.newEmailAccount + "' is not a correct email account (ex: name@gmail.com)\"");
            }
        }
    },
    
    on_password_changed: function() {
        global.log("on_password_changed: " + this.newPassword + " | " + this.password);
        // due to a bug in cinnamon applet all the binding functions are called even if the setting wasn't changed
        if (this.newPassword && this.newPassword != this.getPassword()) {
            //this.setPassword(this.newPassword);
            //this.newPassword = ""; // reset the password for security reasons
            this.buildGmailFeeder();
        }
    },

    // check if password and login are filled
    checkCrendentials: function() {
        global.log("checkCrendentials email: " + this.emailAccount + " password: " + this.password);
        return this.password && this.emailAccount; 
    },

    buildGmailFeeder: function() {
        global.log("email: " + this.emailAccount + " password: " + this.password);
        
        this.gmailFeeder = new GmailFeeder.GmailFeeder({
            'username' : this.emailAccount,
            'password' : this.password,
            'callbacks' : {
                'onError' : Lang.bind(this, function(errorCode, errorMessage) { this.onError(errorCode, errorMessage) }),
                'onChecked' : Lang.bind(this, function(params) { this.onChecked(params) })
            }
        });

        // check after 2s
        this.updateTimer(2000);
    },

    selectPythonBin: function() {
        let [res, out, err, status] = GLib.spawn_command_line_sync("python -V");
        var version = String(err).split(" ")[1][0];
        if (version == 2)
            return "python";
        else
            return "python2";
    },
    
    getPassword: function () {
        this.password = this.newPassword;
        
        /*this.password = Secret.password_lookup_sync(
            GMAILCHECKER_SCHEMA, { "string": appletUUID, "string": this.emailAccount }, null);*/
    },
    
    setPassword: function (password) {
        var attributes = {
            "string": appletUUID,
            "string": this.emailAccount
        };
         
        Secret.password_store_sync(
            GMAILCHECKER_SCHEMA, 
            attributes, 
            Secret.COLLECTION_DEFAULT,
            "Label", 
            "Password", 
            null);
            
        this.password = password;
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
            
            for (var i = 0; i < this.newEmailsCount && i < this.maxDisplayEmails ; i++) {
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
        global.log("updateTimer");
        if (this._chkMailTimerId) {
            Mainloop.source_remove(this._chkMailTimerId);
            this._chkMailTimerId = 0;
        }
        if (timeout > 0)
            this._chkMailTimerId = Mainloop.timeout_add(timeout, Lang.bind(this, this.onTimerElasped));
    },

    onTimerElasped: function() {
        global.log("onTimerElasped");
        this.gmailFeeder.check();
        this.updateTimer(this.checkFrequency * 60000); // 60 * 1000 : minuts to milliseconds
    }
};

function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myApplet;
}
