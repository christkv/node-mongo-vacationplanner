var T, lib, libs, oauth, sys, winston, _i, _len, _ref;
oauth = require('oauth');
sys = require('sys');
winston = require('winston');
T = {
  login: function(req, res) {
    return T.consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results) {
      if (error) {
        T.log.info("login error " + error);
        return T.sendError(req, res, "Error getting OAuth request token : " + sys.inspect(error), 500);
      } else {
        req.session || (req.session = {});
        req.session.oauthRequestToken = oauthToken;
        req.session.oauthRequestTokenSecret = oauthTokenSecret;
        return res.redirect("https://twitter.com/oauth/authorize?oauth_token=" + req.session.oauthRequestToken);
      }
    });
  },
  logout: function(req, res) {
    T.log.info("" + req.session.twitter.name + " logged out");
    delete req.session.twitter;
    return res.redirect(T.options.afterLogout);
  },
  callback: function(req, res) {
    return T.consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(err, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (err) {
        T.sendError(req, res, ("Error getting OAuth access token : " + (sys.inspect(err))) + ("[" + oauthAccessToken + "] [" + oauthAccessTokenSecret + "] [" + (sys.inspect(results)) + "]"));
      }
      req.session.twitter = {
        accessToken: oauthAccessToken,
        accessTokenSecret: oauthAccessTokenSecret,
        name: results.screen_name
      };
      return res.redirect(T.options.afterLogin);
    });
  },
  sendError: function(req, res, err) {
    if (err) {
      T.log.info("Login error " + err);
      if (process.env['NODE_ENV'] === 'development') {
        return res.send("Login error: " + err, 500);
      } else {
        return res.send('<h1>Sorry, a login error occurred</h1>', 500);
      }
    } else {
      return res.redirect('/');
    }
  },
  debug: function(req, res) {
    var m;
    if (process.env['NODE_ENV'] !== 'development') {
      return res.send('', 404);
    }
    m = '<p><a href="/sessions/login">Login</a> <a href="/sessions/logout">Logout</a></p><h1>Session</h1>';
    if (req.session) {
      m += "<details><summary>exists</summary><pre>" + (sys.inspect(req.session)) + "</pre></details>";
    } else {
      m = '<p>No session. Make sure you included cookieDecoder and session middleware BEFORE twitter.</p>';
    }
    return res.send(m);
  },
  emptyLogger: {
    debug: function() {
      return null;
    },
    info: function() {
      return null;
    }
  },
  middleware: function(_options) {
    var _base, _base2;
    T.options = _options || {};
    (_base = T.options).afterLogin || (_base.afterLogin = '/');
    (_base2 = T.options).afterLogout || (_base2.afterLogout = '/');
    T.log = T.options.logging ? winston : T.emptyLogger;
    T.consumer = new oauth.OAuth("https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token", T.options.consumerKey, T.options.consumerSecret, "1.0A", "" + T.options.baseURL + "/sessions/callback", "HMAC-SHA1");
    return function(req, res, next) {
      var action;
      if (req.url === '/sessions/login') {
        action = T.login;
      } else if (req.url === '/sessions/logout') {
        action = T.logout;
      } else if (req.url === '/sessions/debug') {
        action = T.debug;
      } else if (req.url.match(/^\/sessions\/callback/)) {
        action = T.callback;
      }
      if (action) {
        return action(req, res);
      } else {
        return next();
      }
    };
  },
  get: function(url, req, callback) {
    if (req.session.twitter == null) {
      callback('no twitter session');
    }
    return T.consumer.get(url, req.session.twitter.accessToken, req.session.twitter.accessTokenSecret, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  getJSON: function(apiPath, req, callback) {
    if (req.session.twitter == null) {
      callback('no twitter session');
    }
    return T.consumer.get("http://api.twitter.com/1" + apiPath, req.session.twitter.accessToken, req.session.twitter.accessTokenSecret, function(err, data, response) {
      return callback(err, JSON.parse(data), response);
    });
  },
  post: function(url, body, req, callback) {
    if (req.session.twitter == null) {
      callback('no twitter session');
    }
    return T.consumer.post(url, req.session.twitter.accessToken, req.session.twitter.accessTokenSecret, body, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  postJSON: function(apiPath, body, req, callback) {
    var url;
    if (req.session.twitter == null) {
      callback('no twitter session');
    }
    url = "http://api.twitter.com/1" + apiPath;
    return T.consumer.post(url, req.session.twitter.accessToken, req.session.twitter.accessTokenSecret, body, function(err, data, response) {
      return callback(err, JSON.parse(data), response);
    });
  },
  getSelf: function(req, callback) {
    return T.get('http://twitter.com/account/verify_credentials.json', req, function(err, data, response) {
      return callback(err, JSON.parse(data), response);
    });
  },
  getFollowerIDs: function(name, req, callback) {
    return T.getJSON("/followers/ids.json?screen_name=" + name + "&stringify_ids=true", req, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  getFriendIDs: function(name, req, callback) {
    return T.getJSON("/friends/ids.json?screen_name=" + name + "&stringify_ids=true", req, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  getUsers: function(ids, req, callback) {
    return T.getJSON("/users/lookup.json?include_entities=false&user_id=" + (ids.join(',')), req, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  follow: function(id, req, callback) {
    return T.postJSON("/friendships/create/" + id + ".json", "", req, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  unfollow: function(id, req, callback) {
    return T.postJSON("/friendships/destroy/" + id + ".json", "", req, function(err, data, response) {
      return callback(err, data, response);
    });
  },
  status: function(status, req, callback) {
    return T.postJSON("/statuses/update.json?status=" + status, '', req, function(err, data, response) {
      return callback(err);
    });
  }
};
module.exports = {};
libs = "middleware,login,logout,get,getJSON,post,postJSON,getSelf,getUsers,getFriendIDs,getFollowerIDs,follow,unfollow,status";
_ref = libs.split(',');
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  lib = _ref[_i];
  module.exports[lib] = T[lib];
}