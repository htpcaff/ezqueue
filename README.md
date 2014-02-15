ezqueue
=======

In short, Ezqueue is a Node.js web app that brings EasyNews Global Search together with the Free Internet Download Manager for remotely searching and downloading files to a PC. Why is it special? Well there is no all-in-one solution that lets you queue files for download from Easynews to a remote PC, or manage sorting those downloads for use. The main application is on a Windows based HTPC, where you're on your iPhone or laptop, and want to queue an Easynew search file for download on your HTPC. It saves you the trouble of remoting into the HTPC, downloading from a laptop then transfering it over, and ultimately managing those downloads/transfers.

The end result is a simple Web page hosted on your HTPC that will let you search Easynews + download directly to the HTPC and finally rename/move those downloads to directories for use by other software. (e.g. XBMC, etc...) It's actually awesome and I appreciate that a lot of HTPC users won't appreciate it.

Installation 
=======

*Requirements*

1. An Easynew account. (http://www.easynews.com/) They offer a trial if you're cheap. If you don't know who thy are, how did you find this project?!?

2. Download and install the Free Download Manager (http://www.freedownloadmanager.org/) which includes a separate "Remote Control Server" you can run that serves up a web page for pasting in URLs to queue for download, viewing downloads in progress, and viewing completed downloads.

	1.1. After installing FDM, open the Start menu and type "FDM remote control server". Click the "e" icon in your system tray. Check "Load on startup", note the port and "Protect access to server" with a username and password.

	1.2. Try using it by clicking "Open in browser" so you get an idea of what Ezqueue is working with.

*Installing Ezqueue*

1. Download the "Download ZIP" from this Github project.

2. Unzip it some place appropriate. e.g. C:\ezqueue

3. Download and install Node.js (http://nodejs.org/) for Windows. (I'm still targeting Windows here)

4. Edit env.bat, make sure the location of your installed Node.js directory is right. (e.g. C:\Program Files\nodejs) Ignore the node_modules\.bin part.

```
set PATH=%PATH%;C:\Program Files\nodejs;%CWD%\node_modules\.bin
```

5. Open cmd.exe and cd to your ezqueue directory. (e.g. cd C:\ezqueue)

6. Type "env.bat".

7. Type "npm install". This will download all the Node.js supporting packages. (I tested this as of 02-15-2014)

8. For some reason, "npm install" wouldn't include mkdirp when I tested these instructions. Run this for good measure:

```
npm install mkdirp
```

9. Edit app.js and change the following settings to your own:

```
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
```

10. Type rollup.bat to start the service. You should see "Express server listening on port 3000".

First time use
=======

Open a web browser from the same PC and try connecting to the site: http://127.0.0.1:3000/ezqueue

You should see a mostly white page with a search bar. Try typing in something like "Trailers", you should see some logging appear in your cmd.exe window, and eventually when the Easynews search query completes, a list of matching items. If you click/touch one of them, it'll open and a preview image will be downloaded and inserted. (give it a second to download)

IMPORTANT: If everything is going well so far, that means you've installed and configured the app correctly. The next step is getting your Easynews account info into FDM so it can continue to download files for you without needs an account prompt each time.

Pick a search item and click on the cloud icon to start queuing it. In FDM you should see the file get queued but it won't start downloading right away. The download will pop up and ask for a username and password. Type it in, but check off that you want to store the account in FDM. Cancel the download. (delete it from FDM)

Go back into the ezqueue web page and click the cloud icon again. The file should get queued and start downloading automatically to the rootDownloadPath value you set in step #9.

If you click the Progress icon in the toolbar, the download should show and update every couple of seconds. When its complete, it disappears from the list.

If you click the Completed icon in the toolbar, you'll see the downloaded file. If you click the cloud icon next to a file, you'll get a pop up that allows you to rename and move the file to another location. These move locations are based on the defaultDestinations setting in step #9.

IMPORTANT: If the defaultDestinations those directories don't exist, you'll get an error. Either change the setting or remove them. For example, if I only wanted Movies and Shows, in a different location:

```
var defaultDestinations = { // Target directories where downloads can be moved to
	"movies": {
		name: 'Films Videos',
		path: 'G:/Library/Videos/Films',
		tree: {}
	},
	"shows": {
		name: 'Television',
		path: 'G:/Library/Videos/Television',
		tree: {}
	}
};
```

Ezqueue will use these directories as the start of a sub-directory search. So if you have a bunch of sub-directories under "Television", all of them will appear in the Completed as well.

If you want to create a new sub-directory, (e.g. G:/Library/Videos/Television/Sherlock) you can type it in the directory field, then click ok.

Tweaks
=======

FDM out-of-the-box can be annoying if its running on a HTPC. You can configure it to not display any download progress, the download drag and drop area, and I recommend you automatically remove downloads from the queue when they're complete. This will keep FDM clean, since you won't be looking at it again for a while.

Once you have it all working as you like, you'll want it to start up with your PC every time. I used HStart (http://www.ntwind.com/software/hstart.html) to launch the rollup.bat everytime my PC start. There is a Node.js Windows Service module, but honestly I couldn't be bothered and I know that Windows service permissions are kind of a black hole I didn't want to waste time on.

Design notes
=======

I've been experimenting on and off for years with the idea of a local service inside your HTPC that would front-end EasyNew's Global Search site. If you're an EasyNews users you know that files would normally be download to your PC/laptop, then copied to your HTPC or a networked server. It's a time consuming process where a lot of redundant transfer is going on. Ideally you could simply view the Global Search, queue the file, and have the target PC download it directly, and support a file copy/sort mechanism so you don't have to find a PC and copy/paste/rename accordingly.

In the past I've come close to acheiving this nirvana, but writing a multi-threaded download manager that supports HTTPS and user authentication was a headache. This time around I was determined to find another source for the download manager support, and I skipping looking for an API I could leverage and straight to actual software application that offered a web service API that my application could talk to. I approached the Internet Download Manager (http://www.internetdownloadmanager.com/) people, since I love their product and paid for a license, but they weren't interested in adding support for a Web API, or even a robust command line interface.

The Free Download Manager (http://www.freedownloadmanager.org/) however includes a separate "Remote Control Server" you can run that serves up a web page for pasting in URLs to queue for download, viewing downloads in progress, and viewing completed downloads. This afforded me some hope. When you install FDM, Remote Control Server can be started from the Start Menu. It has username/password options as well.

The next step was to decide how and where a component could sit that would help with viewing Easynews Global Searches, so I could insert some functionality that could talk to FDM and queue the download. In the past I would just implement a Python based web server and do everything myself. This time I decided to try something different. (I don't actually like Python that much) So I gave Node.js a try.

The ezqueue Node.js app is basically a web application server that's dedicated to serving web pages that proxy your search requests through it to Easynews servers. The app is intended to be installed on a Windows HTPC or any platform server really, though it works with FDM which is Windows only. You could run ezqueue on a Linux server and have it queue to FDM on a Windows PC, but that would be a bit redundant. The code is here for you to modify.

1. Listens for HTTP on port 3000 (by default)

2. Serves up Web pages for /ezquery (e.g. http://htpc.atyourhome:3000/ezquery) that support:

	2.1. Searching "Easynews Global Search" files complete with thumbnail and preview image download and caching. Each search result can be queued (a cloud icon) to the FDM via its Remote Control Server.
	
	2.2. A Progress page which dynamically updates a list of downloads in progress. When a download is complete, it is removed from the list.
	
	2.3. A Complete page which shows completed downloads. The files can be renamed and moved to any directory on the PC, though a set of default directories are provided.

Even with its current flaws and bugs, it's actually been reliable!

Known Issues
=======

1. The MonkeyTime.js Ajax calls to app.js should be tweaked to be more responsive. When the Progress page loads, or a download is queued, the app.js request should start faster.

2. Noticed that items in Completed were still being downloaded and under the Progress list. Note sure why this was.

3. Some CSS bugs. The Web app is supposed to be responsive but it's the first time I've bothered to support iPads, iPhone and laptop PCs from the same web page.

Future Stuff
=======

1. Support for advanced searches. Choosing file type, asc/dsc by value (sort desc by date), select max search items to display, paging large list of search items.

2. Search query page should remember last X searches, and support a search "watch list" for quickly searching previous searches that you're not done with.

3. Augment search "watch list" with external data sources. (e.g. IMDB Charts, other release sources)

4. Add support for securing account info.

5. Add support for central external config file.