// Gmail Checker Cinnamon Applet
// Developed by Nicolas LLOBERA <nllobera@gmail.com> from
// # the Gmail Notifier Cinnamon Applet by denisigo <denis@sigov.ru> [http://cinnamon-spices.linuxmint.com/applets/view/73]
// # the icons of the gmail-plasmoid project - [http://code.google.com/p/gmail-plasmoid]
// version: 2.0 (07-06-2013)
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
const Soup = imports.gi.Soup;
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

const DebugMode = false;
function LogDebug(message) {
    if (DebugMode)
        global.log(message);
}


function MyApplet(metadata, orientation, panel_height, instanceId) {
    this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instanceId) {
        LogDebug("START");
        this.timer_id = 0;
        this.newEmailsCount = 0;

        Applet.IconApplet.prototype._init.call(this, orientation, panel_height, instanceId);

        try {
            this.set_applet_icon_path(AppletDirectory + '/icons/NoEmail.svg');
          
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager.addMenu(this.menu);
          
            this.settings = new Settings.AppletSettings(this, appletUUID, instanceId);
            this.bind_settings();
          
            this.createContextMenu();
            
            this.init_email_feeder();
            
            if (this.check_crendentials()) {
                // check after 2s
                this.update_timer(2000);
            }
            else {
                this.notify("No credentials");
                Util.trySpawnCommandLine("cinnamon-settings applets " + appletUUID);
            }
        }
        catch (e) {
            this.notify(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
    
    createContextMenu: function() {
        let check_menu_item = new Applet.MenuItem("Check", "mail-receive"/*Gtk.STOCK_REFRESH*/, Lang.bind(this, function() {
            if (this.check_crendentials())
                this.on_timer_elapsed();
            else
                this.notify("No credentials");
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

    bind_settings: function() {
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "EmailAccount", "new_email_account", this.on_settings_changed, null);
            
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "Password", "new_password", this.on_settings_changed, null);
            
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "StorePasswordInKeyring", "store_in_keyring", this.on_store_password_changed, null);
        
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "DisplayedEmailsNumber", "displayed_emails_number", this.rebuild_popup_menu, null);
            
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "CheckFrequency", "check_frequency", this.on_settings_changed, null);
            
        this.settings.bindProperty(Settings.BindingDirection.IN,
            "DisplayNotifications", "display_notifications", this.on_settings_changed, null);
    },
    
    on_settings_changed: function() {
    },
    
    // Use a button in the setting to set the credentials because the "entry" setting type emits the modification signal
    // for each add/remove of character in the textbox. This is not the attended behavior.
    on_email_and_password_changed: function() {
        LogDebug("on_email_and_password_changed: " + this.new_email_account + " | " + this.new_password);
        
        this.emailAccount = this.new_email_account;
        this.set_password(this.new_password);
            
        // on_authentication will be called automatically if a valid connection is not yet set
        // If a valid connection is already set, it seems impossible to change it
        
        if (this.check_crendentials())
            this.on_timer_elapsed();
    },
    
    on_email_changed: function() {
        LogDebug("on_email_changed: " + this.new_email_account + " | " + this.emailAccount);
        
        // on_email_changed is called more than one during the user typing
        // so proceed to the email modification only if the new email is entirely typed
        var regex = new RegExp('[a-zA-Z0-9_\.-]+@[a-zA-Z0-9_\.-]+\\.[a-zA-Z]{2,}');
        if (regex.test(this.new_email_account)) {
            LogDebug("new email: " + this.new_email_account);
            this.emailAccount = this.new_email_account;
            
            // on_authentication will be called automatically if a valid connection is not yet set
            // If a valid connection is already set, it seems impossible to change it
            
            if (this.check_crendentials())
                this.on_timer_elapsed();
        }
    },
    
    on_password_changed: function() {
        LogDebug("on_password_changed: " + this.new_password + " | " + this.password);
        
        this.set_password(this.new_password);
        if (this.check_crendentials())
            this.on_timer_elapsed();
    },

    on_store_password_changed: function() {
        // only if a password is already known
        if (this.password)
            this.set_password(this.password); // store the password in its new place
    },

    // check if password and login are filled
    check_crendentials: function() {
        LogDebug("check_crendentials email: " + this.emailAccount + " password: " + this.password);
        return this.password && this.emailAccount; 
    },

    // get the password from the setting or Gnome Keyring
    get_password: function () {
        if (this.store_in_keyring) {
            this.password = Secret.password_lookup_sync(
                GMAILCHECKER_SCHEMA, { "string": appletUUID, "string": this.emailAccount }, null);
        }
        else
            this.password = this.new_password;
    },
    
    set_password: function (password) {
        if (this.store_in_keyring) {
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
        }
        else
            this.password = password;
    },

    on_error: function(errorCode, errorMessage) {        
        var message = "";
        switch (errorCode) {
            case 'authFailed':
                message = "Authentication failed";
                
                this.newEmailsCount = 0;
                this.menu.removeAll();
                
                let iconPath = AppletDirectory + "/icons/NoEmail.svg";
                if (this.__icon_name != iconPath)
                    this.set_applet_icon_path(iconPath);
                break;
                
            case 'feedReadFailed':
                message = "Feed reading failed. " + errorMessage;
                break;
                
            case 'feedParseFailed':
                message = "Feed parsing failed. " + errorMessage;
                break;
        }
        
        this.notify(message);
    },
  
    build_popup_menu: function() {
        LogDebug("build_popup_menu");
        if (this.inbox.count > 0) {        
            this.rebuild_popup_menu();

            this.set_applet_tooltip('You have ' + this.inbox.count + ' new mails.');
            
            var iconName = this.inbox.count > 9 ? "+" : this.inbox.count;
            var iconPath = AppletDirectory + "/icons/" + iconName + ".svg";
            if (this.__icon_name != iconPath)
                this.set_applet_icon_path(iconPath);
        }
        else {
            var iconPath = AppletDirectory + "/icons/NoEmail.svg";
            if (this.__icon_name != iconPath)
                this.set_applet_icon_path(iconPath);
            this.set_applet_tooltip("You don't have new emails.");
            this.menu.removeAll();
        }
    },
    
    rebuild_popup_menu: function() {
        LogDebug("rebuild_popup_menu");     
        this.menu.removeAll();
        
        for (let i = 0; i < this.inbox.count && i < this.displayed_emails_number ; i++) {
            let message = this.inbox.messages[i];
            
            if (i > 0) this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            let menuItem = new PopupMenuExtension.PopupImageLeftMenuItem(
                _("From:") + " " + message.authorName + "\r\n" + 
                message.title + "\r\n\r\n" + message.summary + "\r\n...", 
                "mail-read", 
                message.id == null ? 
                "xdg-open " + GmailUrl :
                "xdg-open " + GmailUrl + "/mail/#inbox/" + message.id);
            
            menuItem.connect("activate", function(actor, event) { Util.spawnCommandLine(actor.command); });
            this.menu.addMenuItem(menuItem);
        }
    },

    // update the time to wait until the next emails check
    update_timer: function(timeout) {
        LogDebug("update_timer " + timeout + " milliseconds");
        // if this.timer_id != 0, it means a timer is running
        if (this.timer_id) {
            // stop the current running timer
            Mainloop.source_remove(this.timer_id);
            this.timer_id = 0;
        }
        
        // start a new timer with the new timeout
        this.timer_id = Mainloop.timeout_add(timeout, Lang.bind(this, this.on_timer_elapsed));
    },

    // when it's time to check the emails
    on_timer_elapsed: function() {
        LogDebug("on_timer_elapsed");
        // check emails
        let message = Soup.Message.new('GET', 'https://mail.google.com/mail/feed/atom/');
        this.http_session.queue_message(message, Lang.bind(this, this.on_response));

        this.update_timer(this.check_frequency * 60000); // 60 * 1000 : minuts to milliseconds
    },
    
    notify: function(message) {
        if (this.display_notifications)
            Util.spawnCommandLine("notify-send --icon=error \"" + AppletName + ": " + message + "\"");
        this.set_applet_tooltip(message);
        global.logError(AppletName + ": " + message);
    },
    
    on_applet_removed_from_panel: function() {
        LogDebug("on_applet_removed_from_panel");
        
        // if this.timer_id != 0, it means a timer is running
        if (this.timer_id) {
            // stop the current running timer
            Mainloop.source_remove(this.timer_id);
        }
        
        this.settings.finalize();
    },
    
    init_email_feeder: function() {
        LogDebug("init_email_feeder");
        this.emailAccount = this.new_email_account;
        this.get_password();
        
        // Creating Namespace
        this.atomns = new Namespace('http://purl.org/atom/ns#');
        
        // Creating SessionAsync
        //this.http_session = new Soup.SessionAsync();
        this.http_session = new Soup.Session();
        
        // If you are using a plain SoupSession (ie, not SoupSessionAsync or SoupSessionSync), 
        // then a SoupProxyResolverDefault will automatically be added to the session.
        // Adding ProxyResolverDefault
        //Soup.Session.prototype.add_feature.call(this.http_session, new Soup.ProxyResolverDefault());
        
        // Disconnect the previous authenticate signal
        /*if (this.authenticate_signal_id) {
            LogDebug("disconnect: " + this.authenticate_signal_id);
            this.http_session.disconnect(this.authenticate_signal_id);
        }*/
        
        // Connecting to authenticate signal
        //this.authenticate_signal_id = this.http_session.connect('authenticate', Lang.bind(this, this.on_authentication));
        this.http_session.connect('authenticate', Lang.bind(this, this.on_authentication));
        //LogDebug("connect: " + this.authenticate_signal_id);
        // The "authenticate" signal is emitted when the session requires authentication. 
        // If credentials are available call soup_auth_authenticate() on auth. 
        // If these credentials fail, the signal will be emitted again, with retrying set to TRUE, 
        // which will continue until you return without calling soup_auth_authenticate() on auth
    },
    
    on_authentication: function(session, msg, auth, retrying, user_data) {
        LogDebug("on_authentication: " + this.emailAccount + " | " + this.password);
        if (retrying)
            this.on_error("authFailed");
        else
            auth.authenticate(this.emailAccount, this.password);
    },
    
    on_response: function(session, message) {
        LogDebug("on_response");
        var atomns = this.atomns;

        if (message.status_code != 200) {
            if (message.status_code != 401 && message.status_code != 7) {
                this.on_error("feedReadFailed", "Status code : " + message.status_code);
            }
            
            // log only for warning message
            global.log("Feed reading failed. Status code : " + message.status_code);
            return;
        }
        
        /* Status Code
         * 1 SOUP_STATUS_CANCELLED
         * 2 SOUP_STATUS_CANT_RESOLVE
         * 3 SOUP_STATUS_CANT_RESOLVE_PROXY
         * 4 SOUP_STATUS_CANT_CONNECT
         * 5 SOUP_STATUS_CANT_CONNECT_PROXY
         * 6 SOUP_STATUS_SSL_FAILED
         * 7 SOUP_STATUS_IO_ERROR
         * 8 SOUP_STATUS_MALFORMED
         * 9 SOUP_STATUS_TRY_AGAIN
         * 10 SOUP_STATUS_TOO_MANY_REDIRECTS
         * 11 SOUP_STATUS_TLS_FAILED
         * 
         * 200 Ok
         * 
         * 401 Unauthorized (authentication is required and has failed or has not yet been provided)
         * 405 Method Not Allowed
         */

        try {
            let feed = message.response_body.data;

            feed = feed.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
            feed = new XML(feed); // ECMAScript for XML (E4X)

            let newMailsCount = feed.atomns::entry.length();

            this.inbox = { 'count' : newMailsCount, 'messages' : [] };
            
            let messageIdRegex = new RegExp("message_id=([a-z0-9]+)&");
            
            for (let i = 0; i < newMailsCount; i++) {
                let entry = feed.atomns::entry[i];
                
                let messageId = entry.atomns::link.@href;
                let resultRegex = messageIdRegex.exec(messageId);
                
                let email = {
                        'title' : entry.atomns::title,
                        'summary' : entry.atomns::summary,
                        'authorName' : entry.atomns::author.atomns::name,
                        'authorEmail' : entry.atomns::author.atomns::email,
                        'id' : resultRegex != null && resultRegex.length > 1 ? resultRegex[1] : null
                };
                this.inbox.messages.push(email);
            }

            this.build_popup_menu();
        }
        catch (e) {
            this.on_error('feedParseFailed', e);
        }
    }
};

function main(metadata, orientation, panel_height, instanceId) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myApplet;
}
