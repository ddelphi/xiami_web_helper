(function() {

var $ = window.jQuery
var SEIYA = window.SEIYA
var eventSystem = window.EventSystem
eventSystem.init()


/*
	The global options for this script
*/
var options = {
	songListFrame: {
		wrapper: "#J_playTracksList.ui-tracks-wrap",
		itemSelector: ".ui-tracks-wrap",
		current: "ui-track-current",
		currentRoam: "ui-roam-current",
		artist: {
			highlightStyle: {
				"color": "#099D04"
			}
		}
	},
	editFav: {
		url: "http://www.xiami.com/ajax/addtag",
		postParamsPattern: {
			tags: null,
			type: null,
			id: null,
			desc: "",
			share: 0,
			shareTo: "",
			_xiamitoken: "223441f9f5b915b73fcabcab1beb98fb"
		}
	},
	getFav: {
		artist: {
			urlPattern: "http://www.xiami.com/artist/<id>",
			judgePattern: /收藏到音乐库[\s\S]+?display:none.+?>已收藏/i
		},
		song: {
			urlPattern: "http://www.xiami.com/song/playlist/id/<id>/object_name/default/object_id/0/cat/json?_ksTS=<now>_2931&callback=jsonp2932",
			judgePattern: /grade.*?:(.+?)/i
		}
	}
}


/*
	globalEvents object
	To transform some global events into meaningful custom events
*/
var globalEvents = {
	init: function() {
		this.initEvents()
	},
	initEvents: function() {
		this.init_onSongChange()
	},
	
	/* onSongChange */
	
	init_onSongChange: function() {
		var self = this,
			$node,
			currentNode

		var songChangeCallback = function(curNode, info) {
			// console.info("onSongChange info:", info)
			eventSystem.trigger("onSongChange", {
				"target": curNode,
				"info": info
			})
		}
		$(options.songListFrame.itemSelector).bind("DOMSubtreeModified", function(evt) {
			// maybe using promise will be more clearance
			currentNode = $(evt.target)
			if (currentNode.hasClass(options.songListFrame.current)) {
				self.getSongRelInfo(currentNode, songChangeCallback.bind(null, currentNode))
			}
			else if (currentNode.hasClass(options.songListFrame.currentRoam)) {
				self.getSongRelInfoRoam(currentNode, songChangeCallback.bind(null, currentNode))
			}
		})
	},

	/* onSongChange: roam track */

	getSongRelInfoRoam: function($node, callback) {
		var res = {}
		this.getSongRelIdsRoam($node, res)
		this.getSongRelStatus($node, res, callback)
	},
	getSongRelIdsRoam: function($node, res) {
		var songId = $node.find(".ui-roam-sort em").attr("data-sid")
		var songName = $node.find(".c1").text()
		var artistId = $node.find(".c2 a").attr("href").replace(/.+\//, "").replace(/\?.+$/, "")
		var artistName = $node.find(".c2 a").text()
		var albumId = $node.find(".c3 a").attr("href").replace(/.+\//, "").replace(/\?.+$/, "")
		var albumName = $node.find(".c3 a").text()
		res = this.constructInfo(res, songId, songName, artistId, artistName, albumId, albumName)
		return res
	},

	/* onSongChange: normal track */

	getSongRelInfo: function($node, callback) {
		var res = {}
		this.getSongRelIds($node, res)
		this.getSongRelStatus($node, res, callback)
	},
	getSongRelIds: function($node, res) {
		var songId = $node.find(".c1").attr("data-id")
		var songName = $node.find(".c1").text()
		var artistId = $node.find(".c2").attr("data-artist-id")
		var artistName = $node.find(".c2 a").text()
		var albumId = $node.find(".c3").attr("data-album-id")
		var albumName = $node.find(".c3 a").text()
		res = this.constructInfo(res, songId, songName, artistId, artistName, albumId, albumName)
		return res
	},
	getSongRelStatus: function($node, res, callback) {
		var list = [
			{
				type: "artist",
				id: res["artist"].id
			}, {
				type: "song",
				id: res["song"].id
			}
		]
		var len = list.length
		
		var cb = function(item, flag) {
			len = len - 1
			res[item.type].fav = flag
			if (len === 0) {
				callback(res)
			}
		}
		
		// start
		var val
		for (var i = 0; i < list.length; i++) {
			val = list[i]
			xm.getFavStatus(val, cb.bind(cb, val))
		}
	},

	/**/

	constructInfo: function(res, sid, sname, arid, arname, alid, alname) {
		$.extend(true, res, {
			"song": {
				"id": sid,
				"name": sname 
			},
			"artist": {
				"id": arid,
				"name": arname
			},
			"album": {
				"id": alid,
				"name": alname
			}
		})
		return res
	}
}


/*
	uiButtonsVM object
	This is the ui object for fast favoriting song or artist
*/
var uiButtonsVM = {
	init: function() {
		this.template = '<div id="xiami_mod_wrapper"><input type="text" class="tagEditor" value=""><div><span class="addFav">song</span><span class="addArtist">artist</span><span class="addAlbum hide">album</span><span class="changeFav hide">changeFav</span></div><div id="xiami_mod_tooltip"><div class="xm-tooltip info">[INFO] this is tooltip info.</div></div></div>'
		this.style = '#xiami_mod_wrapper {position: absolute;top: 3px;left: 490px;font-size: 14px;color: #555;}#xiami_mod_wrapper span {position: relative;margin: 2px 2px;padding: 3px 8px;background: #66F5B0;border: 1px solid #4BC98C;border-radius: 3px;cursor: pointer;}#xiami_mod_wrapper span:hover {background: #8AF9C4;border: 1px solid #4BC98C;}#xiami_mod_wrapper .tagEditor {display: block;margin: 6px 0;padding: 4px 3px;width: 160px;background: #EFEFEF;border: 1px solid #A1A1A1;border-radius: 3px;font-size: 14px;color: #8D8D8D;outline: none;}#xiami_mod_wrapper .hide {display: none;}/* for tooltip */#xiami_mod_tooltip .xm-tooltip {position: absolute;top: 0;left: 170px;margin: 6px 0;padding: 4px 12px;width: 200px;color: #bbb;font-size: 14px;}/* hide origin xiami */.main-nav {display: none;}'
		this.styleNode = null
		this.parent = "body"
		this.parentNode = null
		this.uis = {
			"addFav": ".addFav",
			"changeFav": ".changeFav",
			"addArtist": ".addArtist",
			"addAlbum": ".addAlbum",
			"tagEditor": ".tagEditor"
		}
		this.status = null
		
		this.initParams()
		this.initEvents()
	},
	initParams: function() {
		// init nodes
		var node = $("<div>").html(this.template)
		this.parentNode = $(this.parent)
		
		this.parentNode.append(node)
		for (var k in this.uis) {
			if (!this.uis.hasOwnProperty(k)) continue
			this.uis[k] = node.find(this.uis[k])
		}
		
		// init styles
		this.styleNode = $("<style>")
		this.styleNode.html(this.style)
		node.append(this.styleNode)
	},
	initEvents: function() {
		var uis = this.uis
		uis.addFav.bind("click", this.addFav.bind(this))
		uis.changeFav.bind("click", this.changeFav.bind(this))
		uis.addArtist.bind("click", this.addArtist.bind(this))
		uis.addAlbum.bind("click", this.addAlbum.bind(this))
		
		eventSystem.register("onSongChange", this.updateStatus.bind(this))
	},

	/* event handlers */

	addFav: function(evt) {
		var song = this.status.info.song
		var data = {
			"type": "song",
			"id": song.id,
			"fav": song.fav,
			"favErrorMsg": "song '%s' has been favorited.".replace("%s", song.name),
			"successMsg": "song '%s' favorited.".replace("%s", song.name),
			"failMsg": "song '%s' favorited wrong.".replace("%s", song.name)
		}
		this.favAction(data)
	},
	changeFav: function(evt) {
		var song = this.status.info.song
		var data = {
			"type": "song",
			"id": song.id,
			"fav": !song.fav,
			"favErrorMsg": "song '%s' has been favorited.".replace("%s", song.name),
			"successMsg": "change song '%s' favorited.".replace("%s", song.name),
			"failMsg": "change song '%s' favorited wrong.".replace("%s", song.name)
		}
		this.favAction(data)
	},
	// todo: fav check
	addArtist: function(evt) {
		var artist = this.status.info.artist
		var data = {
			"type": "artist",
			"id": artist.id,
			"fav": artist.fav,
			"favErrorMsg": "artist '%s' has been favorited.".replace("%s", artist.name),
			"successMsg": "artist '%s' favorited.".replace("%s", artist.name),
			"failMsg": "artist '%s' favorited wrong.".replace("%s", artist.name)
		}
		this.favAction(data)
	},
	// todo
	addAlbum: function(evt) {
		// todo
		console.error("addAlbum() not implement yet.")
	},
	favAction: function(data) {
		if (data.fav) {
			eventSystem.trigger("tooltip", {
				"warn": data.favErrorMsg
			})
			return false
		}
		var self = this
		var tags = this.uis.tagEditor.val()
		
		xm.editFav({
			"id": data.id,
			"type": data.type,
			"tags": tags
		}, function(flag) {
			if (flag) {
				self.status.info[data.type].fav = flag
				eventSystem.trigger("onFavDone", self.status)
			}
			self.triggerLog(flag, data.successMsg, data.failMsg)
		})
	},
	updateStatus: function(data) {
		this.status = data
	},

	/**/
	
	triggerLog: function(flag, tMsg, fMsg) {
		var info = flag ? tMsg : fMsg,
			type = flag ? "info" : "warn",
			infoDict = {}
		infoDict[type] = info

		eventSystem.trigger("tooltip", infoDict)
	}
}

/*
	uiSongListFrame object
	To perform some visual change in the song playlist
*/
var uiSongListFrame = {
	init: function() {
		this.initEvents()
	},
	initEvents: function() {
		eventSystem.register("onSongChange", this.onSongChange.bind(this))
		eventSystem.register("onFavDone", this.onSongChange.bind(this))
	},
	onSongChange: function(data) {
		this.highlightArtist(data)
		this.highlightSong(data)
	},

	/* highlight artist */

	highlightArtist: function(data) {
		var favFlag = data.info.artist.fav
		
		if (favFlag) {
			this.lightArtist(data.target)
		}		
	},
	lightArtist: function($node) {
		var $artistNode = $node.find(".c2 a")
		$artistNode.css(options.songListFrame.artist.highlightStyle)
	},

	/* highlight song */

	highlightSong: function(data) {
		var flag = data.info.song.fav
		if (flag) {
			this.lightSong(data.target)
		}
	},
	lightSong: function($node) {
		window.$target = $node
		var $target = $node.find(".icon-track-fav")
		if ($target.length > 0) {
			$target.removeClass("icon-track-fav")
			$target.addClass("icon-track-faved")
			return
		}

		$target = $node.find(".icon-roam-fav")
		if ($target.length > 0) {
			$target.removeClass("icon-roam-fav")
			$target.addClass("icon-roam-faved")
			return
		}
	}
}

/*
	uiFastCollet object
	To change the behave of the more button in playlist
	to perform one click to open the collecting dialog
*/
var uiFastCollect = {
	init: function() {
		this.initEvents()
	},
	initEvents: function() {
		$("#J_playTracksList").on("mousedown", ".icon-track-more", this.fastCollect.bind(this))
		$("#J_playTracksList").on("mousedown", ".icon-roam-more", this.fastCollect.bind(this))
		// eventSystem.register("onSongChange", this.updateStatus.bind(this))
	},
	fastCollect: function(evt) {
		evt.preventDefault()
		var $node = $(evt.currentTarget)
		var songId = this.findSid($node) 

		if (!songId) { return }
		SEIYA.collect(songId)
	},
	findSid: function($node) {
		var $parent
		if ($node.attr("data-sid")) {
			return ($node.attr("data-sid"))
		} else {
			$parent = $node.parents(".ui-track-item")
			if ($parent.length === 0) { return false }
			return $parent.attr("data-sid")
		}
	}
}


/*
	xm object
	The functional object for getting info
	and perform the favoriting action
*/
var xm = {

	/* fav status */

	getFavStatus: function(data, callback) {
		var type = data.type
		var fn = "getFav_" + type
		if (typeof this[fn] !== "function") return false
		
		this[fn](data, callback)
	},
	getFav_artist: function(data, callback) {
		var url = options.getFav.artist.urlPattern
		var artistId = data.id
		url = url.replace("<id>", artistId)
		
		$.get(url, function(content) {
			var pat = options.getFav.artist.judgePattern
			var flag = !pat.test(content)
			callback(flag)
		})
	},
	getFav_song: function(data, callback) {
		var url = options.getFav.song.urlPattern
		var songId = data.id
		var now = Date.now()
		url = url.replace("<now>", now)
			.replace("<id>", songId)
		
		$.get(url, function(content) {
			var pat = options.getFav.song.judgePattern
			var match = content.match(pat)
			if (match) {
				match = match[1]
			}
			var flag = false
			if (parseInt(match) > -1) {
				flag = true
			}
			callback(flag)
		}, "text")
	},

	/* edit favorite */

	editFav: function(data, callback) {
		var type = data.type
		var fn = "editFav_" + type
		if (typeof this[fn] !== "function") return false
		
		this[fn](data, callback)
	},
	editFav_artist: function(data, callback) {
		var params = $.extend(options.editFav.postParamsPattern, {
			tags: data.tags || "",
			type: 6,
			id: data.id
		})
		this.editFav_post(params, callback)
	},
	editFav_song: function(data, callback) {
		var params = $.extend(options.editFav.postParamsPattern, {
			tags: data.tags || "",
			type: 3,
			id: data.id
		})
		this.editFav_post(params, callback)
	}, 
	editFav_post: function(params, callback) {
		
		var url = options.editFav.url
		$.post(url, params, function(content) {
			var pat = /\"status\":\"ok\"/i
			var flag = pat.test(content)
			callback(flag)
		}, "text")
	}
}


/*
	uiTooltip object
	The ui object for displaying messages
*/
var uiTooltip = {
	init: function() {
		this.elem = $("#xiami_mod_tooltip .xm-tooltip")

		this.timeId = 0
		this.initEvents()
	},
	initEvents: function() {
		eventSystem.register("tooltip", this.tooltip.bind(this))
	},
	tooltip: function(data) {
		for (var k in data) {
			if (!data.hasOwnProperty(k)) continue
			if (typeof this[k] === "function") {
				this[k](data[k])
			}
		}
	},
	info: function(msg) {
		var newMsg = "[OK] " + msg
		this.elem.css("color", "")
		this.elem.html(newMsg)
		this.fadeOut()
		console.info(newMsg)
	},
	warn: function(msg) {
		var newMsg = "[WARN] " + msg
		this.elem.css("color", "#EB7E30")
		this.elem.html(newMsg)
		this.fadeOut()
		console.warn(newMsg)
	},
	fadeOut: function() {
		var self = this
		clearTimeout(this.timeId)
		this.timeId = setTimeout(function() {
			self.elem.html("")
		}, 3000)
	}
}


/* main start */

var main = function() {
	var location = window.location.href
	if (!location.match("xiami.com/play")) {
		console.error("you are not in the xiami player page.")
		return
	}
	uiSongListFrame.init()
	uiButtonsVM.init()
	uiFastCollect.init()
	globalEvents.init()
	uiTooltip.init()

	console.log("[OKAY] xiami_web_helper script loaded!")
}

main()


// window.xm_core = {
// 	"globalEvents": globalEvents,
// 	"uiButtonsVM": uiButtonsVM,
// 	"uiSongListFrame": uiSongListFrame,
// 	"xm": xm
// }

})()