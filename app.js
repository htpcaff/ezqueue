
/*
 * Module dependencies.
 */
var express = require('express');
var cheerio = require('cheerio');
var http = require('http');
var path = require('path');
var request = require('request');
request = request.defaults({jar: true});
var url = require('url');
var FeedParser = require('feedparser');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var app = express();

/*
 * START: User settings and configuration
 */
var username = "username"; // EasyNews account username
var password = "password"; // EasyNews account password

var queueUsername = "username"; // Free Download Manager Remote Control Server username
var queuePassword = "password"; // Free Download Manager Remote Control Server password
var queueServer = "127.0.0.1"; // Free Download Manager Remote Control Server IP address (leave it if on the same PC)
var queueServerPort = "8081"; // Free Download Manager Remote Control Server port

var rootDownloadPath = 'C:/Downloads'; // Download directory path
var defaultDestinations = { // Target directories where downloads can be moved to
	"movies": {
		name: 'Movies',
		path: 'C:/Video/Movies',
		tree: {}
	},
	"shows": {
		name: 'TV Shows',
		path: 'C:/Video/TV Shows',
		tree: {}
	},
	"audio": {
		name: 'Audio',
		path: 'C:/Audio',
		tree: {}
	}
};
var ezThumbUrl = "https://members.easynews.com/thumbview.html?f=";
var queueUrl = "http://"+queueServer+":"+queueServerPort+"/adddownload.req?URL=";
var queueCheckUrl = "http://"+queueServer+":"+queueServerPort+"";
var queueCompletedUrl = "http://"+queueServer+":"+queueServerPort+"/compdlds.req";

var ezUrl = "https://members-beta.easynews.com/global5/index.html?";
var ezParams = "gps=$SUBJECT$&sbj=&from=&ns=&fil=&fex=&vc=&ac=&fty[]=$TYPE$&s1=nsubject&s1d=+&s2=nrfile&s2d=+&s3=dsize&s3d=+&pby=500&pno=1&sS=5&spamf=1&u=1&hthm=1&plain=1&svL=&d1=&d1t=&d2=&d2t=&b1=&b1t=18&b2=&b2t=26&px1=&px1t=&px2=&px2t=&fps1=&fps1t=&fps2=&fps2t=&bps1=&bps1t=&bps2=&bps2t=&hz1=&hz1t=&hz2=&hz2t=&rn1=&rn1t=&rn2=&rn2t=&fly=3"
var thumbUrl = "./images/thumb_test/jpg";
// sS=5 < RRS, sS=0 < plain HTML
// s1,s2,s3 < 3 sorts
//    s1=nrfile < sort 1st filename
//    s1=dsize < sort 1st size
//    s1=dtime < sort 1st date
//    s1d=- < sort 1st desc
// b1t=18 < 300Mb
// b2t=26 < 3Gb
// Parsing EZ RSS, for each <item>, use the <title> and <enclosure> -> url and length attributes, and pubDate for posted date
/*
 * END: User settings and configuration
 */


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
	app.locals.pretty = true;
}

app.configure('production', function () {
	app.use(express.errorHandler());
});

// Routes
app.get('/', function (req, res) {
	res.render('index', { });
});

app.get('/ezquery', function (req, res) {
	console.log('Default load.');
	res.render('index', {
		title: 'Query'
	});
});

/*
 * Handler for any easynews querying
 */
var maxItems = 25;
app.post('/ezquery', function (req, res) {
	//debugger;
	var subject = req.param('searchText');
	var type = req.param('searchType');
	if(subject != undefined) {
		var params = ezParams.replace('$SUBJECT$', subject).replace('$TYPE$', type);
		//params = encodeURIComponent(params);
		//console.log("reqUrl: " + ezUrl + params);
		var itemCount = 0;
		var items = new Array();
		request({
			uri : ezUrl + params,
			'auth': {
				'user': username,
				'pass': password,
				'sendImmediately': true
			}
		})
		.pipe(new FeedParser())
		.on('error', function(error) {
			console.log(error);
		})
		.on('meta', function(meta) {
			console.log('==== %s ====', meta.title);
		})
		.on('readable', function() {
			var stream = this, item;
			while (item = stream.read()) {
			  //console.log('Got article: %s', item.title || item.description);
			  var itemTitle = item.title;
			  try {
				//debugger;
				itemTitle = item.title.match(/\(\d+\/\d+\)\s+\((.*)\s+AutoUnRAR/)[1];
			  } catch(e) {
				// Do nothing
			  }
			  item.itemTitle = itemTitle
			  // For thumb take link, extract /ID.avi/, insert with /ID.jpg
			  var itemId = '';
			  try {
				itemId = item.link.match(/\/443\/([a-z0-9\.]*)\//)[1];
			  } catch(e) {
				//debugger;
			  }
			  //console.log(itemId);
			  item.ID = itemId;
			  item.thumb = ezThumbUrl + itemId + ".jpg";
			  if(itemCount < maxItems) {
				  items.push(item);
				  itemCount += 1;
			  }
			}
			//debugger;
		})
		.on('end', function() {
			res.render('index', {
				subject: subject,
				items: items
			});
		})
	} else {
		console.log('No searchText provided.');
		res.render('index', { });
	}
});

/*
 * Handler for any download queuing
 */
app.post('/ezquery/q', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	var qUrl = req.body.URL;
	if(qUrl != undefined) {
		console.log("Queuing: " + queueUrl + qUrl);
		var queued = false;
		var message = '';
		var auth = "Basic " + new Buffer(queueUsername + ":" + queuePassword).toString("base64");
		request({
			uri: queueUrl + qUrl,
			method: 'GET',
			headers : {
				"Authorization" : auth
			}
		}, function (err, res2, body) {
			//debugger;
			if(res2.statusCode == 200) {
				if(new RegExp("Your request has been procceded successfully.").test(body)) {
					console.log("Download queued.");
					message = "Download queued";
					queued = true;
				} else {
					console.log("Unable to queue download?");
					message = "Error, unable to queue.";
				}
			} else {
				message = "Error accessing Easynews.";
			}
			res.send({
				queued: queued,
				message: message
			});
		});
	} else {
		res.send({
			queued: false,
			message: 'URL is missing.'
		});
	}
});

var imageCache = "./public/images/cache/";
var defaultImage = "./public/images/dogfart.jpg";
app.get('/ezquery/img', function (req, res) {
	var itemID = req.query.thumbID;
	if(itemID) {
		var cacheFile = itemID + '.jpg';
		fs.exists(imageCache + cacheFile, function(exists) {
			if(exists) {
				imgFile = imageCache + cacheFile;
				respondImage(res, imageCache + cacheFile, 'jpeg');
			} else {
				// 1) Get:
				// https://members.easynews.com/thumbview.html?f=4c0bbaf31dd27bbcbb35e3358466069305fdcc479.avi
				// 2) Extract img, get src and download it
				//debugger;
				request({
					uri: ezThumbUrl + itemID,
					method: 'GET',
					'auth': {
						'user': username,
						'pass': password,
						'sendImmediately': true
					}
				}, function (err, res2, body) {
					//debugger;
					$ = cheerio.load(body);
					try {
						var thumbUrl = $('img').attr('src');
						//console.log(thumbUrl);
						request.head(thumbUrl, function(err, res3, body) {
							request(thumbUrl).pipe(
								fs.createWriteStream(imageCache + cacheFile)
									.on('finish', function() {
										respondImage(res, imageCache + cacheFile, 'jpeg');
									}));
						});
					} catch(e) {
						respondImage(res, defaultImage, 'jpeg');
					}
				});
			}
		});
	} else {
		respondImage(res, defaultImage, 'jpeg');
	}
});


function respondImage(res, path, type) {
	var img = fs.readFileSync(path);
	res.writeHead(200, {'Content-Type': 'image/' + type });
	res.end(img, 'binary');
}

app.get('/ezquery/l', function (req, res) {
	res.render('queue', {
		title: 'Query'
	});
});

/*
 * Handler for querying queued items
 */
app.get('/ezquery/ql', function (req, res) {
	//debugger;
	res.setHeader('Content-Type', 'application/json');
	var message = '';
	var auth = "Basic " + new Buffer(queueUsername + ":" + queuePassword).toString("base64");
	request({
		uri: queueCheckUrl,
		method: 'GET',
		headers : {
			"Authorization" : auth
		}
	}, function (err, res2, body) {
		//debugger;
		$ = cheerio.load(body);
		var items = new Array();
		var first = true;
		var message = "";
		try {
			//debugger;
			$('table tr').each(function () {
				// Skip the 1st
				//debugger;
				if(!first) {
					// File name, Size, Progress, Time, Rate
					var tds = $(this).children('td');
					// TODO: Make sure you're getting the item parts correctly!!!
					items.push({
						name: tds[0].children[0].data,
						size: tds[1].children[0].data,
						progress: tds[2].children[0].data,
						time: tds[3].children[0].data,
						rate: tds[5].children[0].data
					});
				}
				first = false;
			});
		} catch(e) {
			message = "Error getting queue";
		}
		res.send({
			count: items.length,
			items: items,
			message: message
		});
	});
});

/*
 * Handler for completed files
 */
app.get('/ezquery/fl', function (req, res) {
	var destinations = readDestinations();
	//debugger;
	res.render('complete', {
		destinations: destinations
	});
});

/*
 * Handler for completed files
 */
function readDirectory(directory) {
	//debugger;
	var stats = fs.lstatSync(directory),
        info = {
            path: directory,
            name: path.basename(directory)
        };
    if (stats.isDirectory()) {
		console.log("Directory: " + directory);
        info.children = fs.readdirSync(directory).map(function(child) {
            return readDirectory(directory + '/' + child);
        });
    }
	return info;
};

function readDestinations() {
	var destinations = defaultDestinations;
	for(var name in destinations) {
		var destination = destinations[name];
		var tree = readDirectory(destination.path);
		destination.tree = tree;
	};
	return destinations;
};

function ppSize(bytes) {
	var s = bytes;
	// Greater than 1 KB?
	if(s > 1024) {
		s = s / 1024; // In Kbs
		// Greater than 1 MB?
		if(s > 1024) {
			s = s / 1024; // In MBs
			// Greater than 1 GB?
			if(s > 1024) {
				s = s / 1024; // In GBs
				s = Math.round(s * 10) / 10;
				return s += " GB";
			} else {
				s = Math.round(s * 10) / 10;
				return s += " MB";
			}
		} else {
			s = Math.round(s * 10) / 10;
			return s += " Kb";
		}
	} else {
		s = Math.round(s * 10) / 10;
		return s += " bytes";
	}
}

/*
 * Handles and returns completed file list
 */
app.get('/ezquery/fll', function (req, res) {
	//debugger;
	var items = new Array();
	var message = '';
	var files = fs.readdirSync(rootDownloadPath);
	for(var i in files) {
		//debugger;
		var stats = fs.lstatSync(rootDownloadPath + '/' + files[i]);
		if (!stats.isDirectory()) {
			items.push({
				name: files[i],
				size: ppSize(stats.size)
			});
		}
	}
	res.send({
		count: items.length,
		items: items,
		message: message
	});
});

/*
 * This one is for moving files
 */
app.post('/ezquery/flm', function (req, res) {
	//debugger;
	var message = '';
	var filename = req.body.filenameOrig;
	// Check if the original filename exists in the default root directory
	if(existsSync(rootDownloadPath+'/'+filename)) {
		// File exists, we can work with this, are we to rename the file?
		var rename = false;
		if(req.body.renamefile) {
			var newFilename = req.body.filename;
			renameSync(rootDownloadPath+'/'+filename, rootDownloadPath+'/'+newFilename)
			filename = newFilename;
		}
		// If filename was renamed, it doesn't matter, its done, we'll move on to moving on!
		if(req.body.movefile) {
			var newPath = req.body.filepath;
			if(!existsSync(newPath)) {
				mkdirp.sync(newPath);
			}
			// Path should be present, move rootDownloadPath+'/'+filename to it!
			renameSync(rootDownloadPath+'/'+filename, newPath+'/'+filename);
		}
	}
	var destinations = readDestinations();
	//debugger;
	res.render('complete', {
		destinations: destinations
	});
});

function existsSync(filePath){
	try {
		fs.statSync(filePath);
	} catch(err){
		//console.log("Error checking file: " + err[text]);
		if(err.code == 'ENOENT') return false;
	}
	return true;
};

function renameSync(oldFile, newFile){
	try {
		fs.renameSync(oldFile, newFile);
	} catch(err){
		//debugger;
		console.log("Error moving file: " + err[text]);
		if(err.code == 'ENOENT') return false;
	}
	return true;
};

/*
 * Handler for quick querying queued items
 */
app.get('/ezquery/qql', function (req, res) {
	debugger;
	res.setHeader('Content-Type', 'application/json');
	var message = '';
	var auth = "Basic " + new Buffer(queueUsername + ":" + queuePassword).toString("base64");
	request({
		uri: queueUrl + qUrl,
		method: 'GET',
		headers : { "Authorization" : auth }
	}, function (err, res2, body) {
		var count = 0;
		var message = "";
		try {
			count = $('table tr td').length - 1;
		} catch(e) {
			message = "Error getting queue";
		}
		$ = cheerio.load(body);
		res.send({
			count: count,
			message: message
		});
	});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

