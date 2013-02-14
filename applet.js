const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Gettext = imports.gettext.domain('cinnamon-applets');
const _ = Gettext.gettext;

const Gtk = imports.gi.Gtk;

const Applet = imports.ui.applet;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const AppletDirectory = imports.ui.appletManager.appletMeta["gmailnotifier@denisigo"].path;
imports.searchPath.push( AppletDirectory );
const GmailFeeder = imports.gmailfeeder;
const Settings = imports.settings;


function MyApplet(orientation) {
  this._init(orientation);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,

  _init: function(orientation) {
    this._chkMailTimerId = 0;
    this.newMailsCount = 0;
    
    this.checkTimeout = Settings.checktimeout * 1000;

    Applet.IconApplet.prototype._init.call(this, orientation);
    
    var this_ = this;

    try {
      this.set_applet_icon_path(AppletDirectory + '/NewEmail.svg');
      this.set_applet_tooltip(_("Open Gmail"));
      
      this.createContextMenu();
      
      this.gf = new GmailFeeder.GmailFeeder({
        'username' : Settings.username,
        'password' : Settings.password,
        'callbacks' : {
          'onError' : function(a_code, a_params) { this_.onGfError(a_code,a_params) },
          'onNewMail' : function(a_params) { this_.onGfNewMail(a_params) },
          'onNoNewMail' : function(a_params){ this_.onGfNoNewMail() }
        }
      });

      this.updateChkMailTimer(/*5000*/this.checkTimeout);
    }
    catch (e) {
      global.logError(e);
    }
  },
  
  onGfError: function(a_code, a_params) {
    switch (a_code) {
      case 'authFailed':
        this.displayNotification("GmailNotifier", _("Gmail authentication failed!"));
        this.set_applet_tooltip(_("Gmail authentication failed!"));
      break;
      case 'feedReadFailed':
        this.displayNotification("GmailNotifier", _("Gmail feed reading failed!"));
        this.set_applet_tooltip(_("Gmail feed reading failed!"));
      break;
      case 'feedParseFailed':
        this.displayNotification("GmailNotifier", _("Gmail feed parsing failed!"));
        this.set_applet_tooltip(_("Gmail feed parsing failed!"));
      break;
    }
  },
  
    onGfNoNewMail: function() {
        if (this._applet_icon_box.child)
            this._applet_icon_box.child.destroy();
            
        this.set_applet_tooltip(_('You don\'t have a new mail.'));
        this.newMailsCount = 0;
        
        this.displayNotification("No New Emails", "");
    },
  
    onGfNewMail: function(a_params) {
        var absNewMailsCount = a_params.count - this.newMailsCount;
        this.newMailsCount = a_params.count;

        if (a_params.count == 1)
            this.set_applet_tooltip(_('You have one new mail. Click to open Gmail.'));
        else
            this.set_applet_tooltip(_('You have ' + a_params.count + ' new mails. Click to open Gmail.'));
        
        if (!this._applet_icon_box.child || this.__icon_name != AppletDirectory + '/NewEmail.svg')
            this.set_applet_icon_path(AppletDirectory + '/NewEmail.svg');

        if (absNewMailsCount > 0) {
            var notifyTitle=_('You have ' + absNewMailsCount + ' new mails.');
            
            var notifyText = '';
            for (var i = 0; i < mailsToDisplay && i < 4 ; i++) {
                var authorName = a_params.messages[i].authorName;
                var title = a_params.messages[i].title;

                notifyText += '<b>' + authorName + '</b>: ' + title + '\r\n';
            }
            
            this.displayNotification(notifyTitle, notifyText);
        }
    },
  
    displayNotification: function(title, message) {
        title = title.replace(/"/g, "&quot;");
        message = message.replace(/"/g, "&quot;");

        Util.spawnCommandLine("notify-send --icon=mail-read \"" + title + "\" \"" + message + "\"");
    },

  on_applet_clicked: function(event) {
    Util.spawnCommandLine("xdg-open http://gmail.com");
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
