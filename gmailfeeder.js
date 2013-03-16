const Soup = imports.gi.Soup;

function GmailFeeder(data) {
	this.feedUrl = "https://mail.google.com/mail/feed/atom/";

	this.callbacks = {
		onError : undefined,
		onChecked : undefined
	};
	
	this.username = undefined;
	this.password = undefined;
	
	if (data != undefined) {
		if (data.callbacks != undefined) {
			this.callbacks.onError = data.callbacks.onError;
			this.callbacks.onChecked = data.callbacks.onChecked;
		}
		
		this.username = data.username;
		this.password = data.password;
	}
	
	try {
		this.atomns = new Namespace('http://purl.org/atom/ns#');
	}
    catch (e) {
		throw 'GmailFeeder: Creating Namespace failed: ' + e;
	}
	
	try {
		this.httpSession = new Soup.SessionAsync();
	}
    catch (e) {
		throw 'GmailFeeder: Creating SessionAsync failed: ' + e;
	}
	
	try {
		Soup.Session.prototype.add_feature.call(this.httpSession, new Soup.ProxyResolverDefault());
	}
    catch (e) {
		throw 'GmailFeeder: Adding ProxyResolverDefault failed: ' + e;
	}
	
    var this_ = this;
	try {
		this.httpSession.connect('authenticate', 
            function(session, msg, auth, retrying, user_data) { 
                this_.onAuth(session, msg, auth, retrying, user_data); } );
	}
    catch (e) {
		throw 'GmailFeeder: Connecting to authenticate signal failed: ' + e;
	}
}

GmailFeeder.prototype.onAuth = function(session, msg, auth, retrying, user_data) {
	if (retrying) {
		if (this.callbacks.onError != undefined) {
			this.callbacks.onError("authFailed");
		}
		return;
	}
    
    //global.log("connect " + this.username + " " + this.password);
	auth.authenticate(this.username, this.password);
}

GmailFeeder.prototype.check = function() {
    let this_ = this;

    let message = Soup.Message.new('GET', this.feedUrl);
    this.httpSession.queue_message(message, function(session, message) { this_.onResponse(session, message) } );
}
	
GmailFeeder.prototype.onResponse = function(session, message) {
    var atomns = this.atomns;

    if (message.status_code != 200) {
        if (message.status_code != 401 && message.status_code != 7) {
            if (this.callbacks.onError != undefined)
                this.callbacks.onError("feedReadFailed", "Status code : " + message.status_code);
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
        var feed = message.response_body.data;

        feed = feed.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
        feed = new XML(feed); // ECMAScript for XML (E4X)

        var newMailsCount = feed.atomns::entry.length();

        var params = { 'count' : newMailsCount, 'messages' : [] };
        
        var messageIdRegex = new RegExp("message_id=([a-z0-9]+)&");
        
        for (var i = 0; i < newMailsCount; i++) {
            var entry = feed.atomns::entry[i];
            
            var messageId = entry.atomns::link.@href;
            var resultRegex = messageIdRegex.exec(messageId);
            
            var email = {
                    'title' : entry.atomns::title,
                    'summary' : entry.atomns::summary,
                    'authorName' : entry.atomns::author.atomns::name,
                    'authorEmail' : entry.atomns::author.atomns::email,
                    'id' : resultRegex != null && resultRegex.length > 1 ? resultRegex[1] : null
            };
            params.messages.push(email);
        }

        if (this.callbacks.onChecked != undefined)
            this.callbacks.onChecked(params);
    }
    catch (e) {
        if (this.callbacks.onError != undefined) {
            this.callbacks.onError('feedParseFailed', e);
        }
    }
}

/*GmailFeeder.prototype.destroy = function() {
    this.callbacks = {
		onError : undefined,
		onChecked : undefined
	};
	
	this.username = undefined;
	this.password = undefined;
}*/
