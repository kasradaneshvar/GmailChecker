const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Gettext = imports.gettext.domain('cinnamon-applets');
const _ = Gettext.gettext;

const Gtk = imports.gi.Gtk;
const St = imports.gi.St;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const AppletDirectory = imports.ui.appletManager.appletMeta["gmailnotifier@denisigo"].path;
imports.searchPath.push( AppletDirectory );
const GmailFeeder = imports.gmailfeeder;
const Settings = imports.settings;

const AppletName = "GmailNotifier";

/***** SETTINGS *****/
// Max number of emails displayed in the popup menu
const MaxDisplayEmails = 4;
// Mailbox checking timeout, in seconds
const CheckTimeout = 300; // 300 = 5mn
/********************/


/* Redefine a PopupImageMenuItem to get a colored image to the left side */
function PopupImageLeftMenuItem() {
    this._init.apply(this, arguments);
}
PopupImageLeftMenuItem.prototype = {
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function (displayName, iconName, command, params) {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        // useful to use application in the connect method
        this.command = command;
        
        this._icon = this._createIcon(iconName);
        this.addActor(this._icon);
        
        this.label = new St.Label({ text: displayName });
        this.addActor(this.label);
    },
    
    _createIcon: function(iconName)
    {
        // if the iconName is a path to an icon
        if (iconName.indexOf("/") !== -1)
        {
            var file = Gio.file_new_for_path(iconName);
            var iconFile = new Gio.FileIcon({ file: file });
            
            return new St.Icon({ gicon: iconFile, icon_size: 24 });
        }
        else // use a themed icon
        {
            return new St.Icon({ icon_name: iconName, icon_size: 24, icon_type: St.IconType.FULLCOLOR });
        }
    }
};

function MyApplet(orientation) {
  this._init(orientation);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {
        this._chkMailTimerId = 0;
        this.newMailsCount = 0;
        
        this.checkTimeout = CheckTimeout * 1000;

        Applet.IconApplet.prototype._init.call(this, orientation);
        
        var this_ = this;

        try {
            this.set_applet_icon_path(AppletDirectory + '/NoEmail.svg');
          
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);
          
            this.createContextMenu();

            this.gf = new GmailFeeder.GmailFeeder({
                'username' : Settings.username,
                'password' : Settings.password,
                'callbacks' : {
                    'onError' : function(a_code, a_params) { this_.onGfError(a_code,a_params) },
                    'onNewMail' : function(a_params) { this_.onGfNewMail(a_params) },
                    'onNoNewMail' : function(a_params) { this_.onGfNoNewMail() }
                }
            });

            // check after 5s
            this.updateChkMailTimer(5000);
        }
        catch (e) {
            global.logError(e);
        }
    },
  
    onGfError: function(a_code, a_params) {
        switch (a_code) {
            case 'authFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \"Gmail authentication failed!\"");
                this.set_applet_tooltip("Gmail authentication failed!");
                break;
            case 'feedReadFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \"Gmail feed reading failed!\"");
                this.set_applet_tooltip("Gmail feed reading failed!");
                break;
            case 'feedParseFailed':
                Util.spawnCommandLine("notify-send --icon=mail-read \"Gmail feed parsing failed!\"");
                this.set_applet_tooltip("Gmail feed parsing failed!");
                break;
        }
    },
  
    onGfNoNewMail: function() {
        /*if (this._applet_icon_box.child)
            this._applet_icon_box.child.destroy();*/
        
        this.set_applet_icon_path(AppletDirectory + '/NoEmail.svg');
        this.set_applet_tooltip("You don't have new emails.");
        this.newMailsCount = 0;
        this.menu.removeAll();
    },
  
    onGfNewMail: function(a_params) {
        // absNewMailsCount : real new emails since the last time onGfNewMail was launched
        var absNewMailsCount = a_params.count - this.newMailsCount;
        this.newMailsCount = a_params.count;
        
        if (absNewMailsCount != 0) {
            this.menu.removeAll();
            for (var i = 0; i < this.newMailsCount && i < MaxDisplayEmails ; i++) {
                var authorName = a_params.messages[i].authorName;
                var title = a_params.messages[i].title;
                var summary = a_params.messages[i].summary;
                
                if (i > 0) this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                
                var menuItem = new PopupImageLeftMenuItem(
                    "From : " + authorName + "\r\n" + title + "\r\n\r\n" + summary + "\r\n...", 
                    "mail-read", "xdg-open http://gmail.com");
                menuItem.connect("activate", function(actor, event) { Util.spawnCommandLine(actor.command); });
                this.menu.addMenuItem(menuItem);
            }

            this.set_applet_tooltip('You have ' + a_params.count + ' new mails.');
            
            var iconName = this.newMailsCount > 9 ? "+" : this.newMailsCount;
            var iconPath = AppletDirectory + "/icons/" + iconName + ".svg";
            if (this.__icon_name != iconPath)
                this.set_applet_icon_path(iconPath);
        }
    },

    on_applet_clicked: function(event) {
        this.menu.toggle();
    },
  
    updateChkMailTimer: function(timeout) {
        if (this._chkMailTimerId) {
            Mainloop.source_remove(this._chkMailTimerId);
            this._chkMailTimerId = 0;
        }
        if (timeout > 0)
            this._chkMailTimerId = Mainloop.timeout_add(timeout, Lang.bind(this, this.onChkMailTimer));
    },

    onChkMailTimer: function() {
        this.gf.check();
        this.updateChkMailTimer(this.checkTimeout);
    },
  
    createContextMenu: function () {
        var this_ = this;
        
        this.check_menu_item = new Applet.MenuItem(_("Check"), Gtk.STOCK_REFRESH, function() {
            this_.onChkMailTimer();
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
    }
};

function main(metadata, orientation) {
    let myApplet = new MyApplet(orientation);
    return myApplet;
}
