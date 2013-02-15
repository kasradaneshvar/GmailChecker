const PopupMenu = imports.ui.popupMenu;

const Gio = imports.gi.Gio;
const St = imports.gi.St;

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
