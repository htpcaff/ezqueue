var urlPrefix = "/easyquery?subject=%SUBJECT%,type=%TYPE%";

$(document).bind( "mobileinit", function(){
	$.support.cors = true;
	$.mobile.allowCrossDomainPages = true;       
}); 

var queueWatch;
function startQueue() {
	clearInterval(queueWatch);
	queueWatch = setInterval(queryQueue, 5000);
}
function stopQueue() {
	clearInterval(queueWatch);
}

var queueItem = "<tr><td class='ez-filename'>$FILENAME$</td><td class='ez-progress'>$PROGRESS$</td><td class='ez-time'>$TIME$</td><td class='ez-size'>$SIZE$</td><td class='ez-speed'>$SPEED$</td></tr>";
function queryQueue() {
	try {
		$.ajax({
			  type: 'GET',
			  url: '/ezquery/ql',
			  dataType: 'json',
			  async: false,
			  success: function(data) {
				//console.log(data.count);
				
				var queue = $('#queueItems');
				var queueItemString = "";
				var queueItemsString = "";
				var items = data.items;
				if(items.length > 0) {
					if(queue) {
						for(var i=0; i< items.length; i++) {
							var item = items[i];
							queueItemString = queueItem.replace("$FILENAME$", item.name);
							queueItemString = queueItemString.replace("$PROGRESS$", item.progress);
							queueItemString = queueItemString.replace("$TIME$", item.time);
							queueItemString = queueItemString.replace("$SIZE$", item.size);
							queueItemString = queueItemString.replace("$SPEED$", item.rate);
							queueItemsString += queueItemString;
						}
						queue.html(queueItemsString);
					}
					$('#queueCount').text(items.length);
					$('#queueCount').show();
				} else {
					// If nothing is downloading, then kill the queue query
					$('#queueCount').hide();
					//alert_success("Queue is empty.", true);
					stopQueue();
				}
			  }
		});
	} catch(e) {
		console.log("Error: " + e.message);
	}
}

var completedFilename = "";
function completedModal(btnElm) {
	completedFilename = $(btnElm).parents('.fileitem').find('.filename').text();
	$('#completedModal').find('#filename').val(completedFilename);
	$('#completedModal').find('#filenameOrig').val(completedFilename);
	$('#completedModal').modal('show');
}

function setMovePath(link, path) {
	$('#filepath').val(path);
	$('.path-link-selected').each(function () {
		$(this).removeClass('path-link-selected');
	});
	$(link).addClass('path-link-selected');
}

function collapse(pathLink) {
	if($(pathLink).nextAll('.path-collapsed').length > 0) {
		// We have some children that are collapsed, so we should uncollapse them
		$(pathLink).nextAll('.path').each(function() {
			$(this).removeClass('path-collapsed');
		});
		$(pathLink).children('.path-clps-col').removeClass('glyphicon-collapse-down');
		$(pathLink).children('.path-clps-col').addClass('glyphicon-collapse-up');
	} else { 
		// Otherwise we're collapsing all the children paths
		$(pathLink).nextAll('.path').each(function() {
			$(this).addClass('path-collapsed');
		});
		$(pathLink).children('.path-clps-col').removeClass('glyphicon-collapse-up');
		$(pathLink).children('.path-clps-col').addClass('glyphicon-collapse-down');
	}
}

var completeWatch;
function startComplete() {
	clearInterval(completeWatch);
	completeWatch = setInterval(queryCompleted, 10000);
}
function stopComplete() {
	clearInterval(completeWatch);
}

var completeItem = "<tr class='fileitem'><td class='filename'>$FILENAME$</td><td>$SIZE$</td><td><a href='#' class='ez-dl-btn btn btn-default' onclick='completedModal(this);'><span class='glyphicon glyphicon-cloud-download'></span></a></td>";

function queryCompleted() {
	try {
		$.ajax({
			  type: 'GET',
			  url: '/ezquery/fll',
			  dataType: 'json',
			  async: false,
			  success: function(data) {
				var queue = $('#completeItems');
				var itemString = "";
				var itemsString = "";
				var items = data.items;
				if(items.length > 0) {
					if(queue) {
						for(var i=0; i< items.length; i++) {
							var item = items[i];
							itemString = completeItem.replace("$FILENAME$", item.name);
							itemString = itemString.replace("$SIZE$", item.size);
							itemsString += itemString;
						}
						queue.html(itemsString);
					}
				} else {
					stopComplete();
				}
			  }
		});
	} catch(e) {
		console.log("Error: " + e.message);
	}
}

function queueEz(el, link) {
	try {
		$.ajax({
			  type: 'POST',
			  url: '/ezquery/q',
			  dataType: 'json',
			  data: { URL: link },
			  async: false,
			  success: function(data) {
				if(data.queued) {
					//console.log(data.message);
					$(el).parents('div.ui-collapsible').find('a.ui-collapsible-heading-toggle').removeClass('ui-btn-up-c').addClass('ui-btn-up-a');
					if(data.message) alert_success(data.message, true);
					startQueue();
				} else {
					//console.log(data.message);
					if(data.message) alert_error(data.message, true);
				}
			  }
		});
	} catch(e) {
		console.log("Error: " + e.message);
	}
	return false;
}

function alert_success(msg, timed_fade) {
    if(msg.length > 0) {
        var id = new Date().getTime();
        $('#alert').append('<div id="alert_'+id+'" style="display: none;" class="alert alert-success fade in"><a class="close" data-dismiss="alert">&times;</a>' + msg + '</div>').fadeIn();
        $('#alert').find('.alert:last').slideDown('slow');
        if(timed_fade) {
            if(timed_fade == true) {
                timed_fade = 3000;
            }
            alert_timed_fade($('#alert_'+id), timed_fade);
        }
    }
}

function alert_error(msg, timed_fade) {
    if(msg.length > 0) {
        var id = new Date().getTime();
        $('#alert').append('<div id="alert_'+id+'" style="display: none;" class="alert alert-error fade in"><a class="close" data-dismiss="alert">&times;</a>' + msg + '</div>').fadeIn();
        $('#alert').find('.alert:last').slideDown('slow');
        if(timed_fade) {
            if(timed_fade == true) {
                timed_fade = 3000;
            }
            alert_timed_fade($('#alert_'+id), timed_fade);
        }
    }
}

function alert_timed_fade(jelement, time) {
    setTimeout(function() {
        jelement.slideUp("slow", function() {
            jelement.remove();
        });
    }, time);
}

function queryEz(search) {
	var url = urlPrefix.replace("%SUBJECT%", search);
	url = url.replace("%TYPE%", "VIDEO");
	$.ajax({
		  type: 'GET',
		  url: encodeURIComponent(url),
		  dataType: 'html',
		  success: function(data) {
			  try {
				var active = $('#active');
				var html = $.parseHTML(data);
				console.log(data);
				
				var subjects = $(html).filter('.subject');
				if(subjects[0] == undefined) {
					if(data.message) alert_success("No search results found.", true);
				} else {
					var resultItems = $('#results-items');
					subjects.each(new function() {
						var title = $(this).find('a:first').text();
						var item = $('subject-template').clone();
						item.find('.subject-template-title').text(title);
						resultItems.children().append(item);
						item.show();
					});
				}
			  } catch(e) {
				$('#status').text("Error: " + e.message);
				return;
			  }
		  }
    });
}

function setEzThumb(target, itemID) {
	if($(target).attr('alt') != 'Loading...') {
		// Simply set the img's src to the node app's /ezquery/img?thumbID=<itemID>
		var newSrc = '/ezquery/img?thumbID=' + itemID;
		$(target).attr('src', newSrc);
		$(target).attr('alt', 'Loading...');
	}
}
