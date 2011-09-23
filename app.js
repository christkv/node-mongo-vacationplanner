var app, express, redisStore, sys, twitter;
var express = require('express'),
  sys = require('sys'),
  twitter = require('./lib/twitter/twitter'),
  app = express.createServer();

// redisStore = require('connect-redis')(express);  

// Set up cookie parser  
app.use(express.cookieParser()),
// Set up session storage (using default memory store)
app.use(express.session({
  secret: 'randomness',
  // store: new redisStore(),
  maxAge: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000)
}));

// Set up views directory
app.set('views', __dirname + '/views');
// Set default template engine to 'jade'
app.set('view engine', 'jade');
// Set up twitter middleware
app.use(twitter.middleware({
  consumerKey: "3T3sx20TMn8z1uC2EXWMw",
  consumerSecret: "engeqrh2yyeTdE1BkSzwEs7qozHoWjuP6lt1NDFpBBw",
  baseURL: 'http://localhost:3000',
  logging: true,
  afterLogin: '/hello',
  afterLogout: '/goodbye'
}));
// Defined public static assets
app.use(express.static(__dirname + '/public'));

// set default layout, usually "layout"
//app.locals.layout = 'layouts/default';




app.get('/', function(req, res) {
  var message;
  // message = req.session.twitter ? "Ahoy " + req.session.twitter.name + ". <a href='/sessions/logout'>Logout</a>" : 'Logged out. <a href="/sessions/login">Login Now!</a>';
  // return res.send("<h3>express-twitter demo</h3><p>" + message + "</p>");
  res.render('main/index');
});

app.get('/follow', function(req, res) {
  return twitter.postJSON('/friendships/create/mahemoff.json', '', req, function(err, data, response) {
    return res.send("Welcome to the universe of infinite rant. Info on user returned: " + (sys.inspect(data)));
  });
});

app.get('/sendAnActualTweet', function(req, res) {
  return twitter.status("Test tweet. Please ignore.", req, function(err, data, response) {
    return res.send("Error returned? " + (sys.inspect(err)));
  });
});

app.get('/hello', function(req, res) {
  return res.send("Welcome " + req.session.twitter.name + ".<hr/>\n<a href=\"/sessions/debug\">debug</a>  <a href=\"/you\">about you</a>\n<a href=\"/follow\">follow @mahemoff</a> <a href=\"/sessions/logout\">logout</a>");
});

app.get('/goodbye', function(req, res) {
  return res.send('Our paths crossed but briefly.');
});

app.get('/you', function(req, res) {
  return twitter.getSelf(req, function(err, you, response) {
    return res.send("Hello " + you.name + ". Twitter says of you:<pre>" + (sys.inspect(you)) + "</pre>");
  });
});

app.get('/friends', function(req, res) {
  return twitter.getFriendIDs(req.session.twitter.name, req, function(err, friends, response) {
    return res.send("A few friends then. " + (sys.inspect(friends)));
  });
});

app.listen(3000);