/********************************/
/*       Basic setup            */
/********************************/

var socket = io();

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Strict";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

var room = getCookie("roomid") == "" ? null : getCookie("roomid");
var roominfo = null;
var username = getCookie("username");
var userid = getCookie("playerid") == "" ? 0 : getCookie("playerid");
var font = "Showcard Gothic";
var pointerRects = [];
var roomlist = null;

/********************************/
/*    Interaction handlers      */
/********************************/

function canvasMouseMove(event) {
	var canvas = document.getElementById("canvas");
	var rect = canvas.getBoundingClientRect();
	var x = event.clientX - rect.left - 5;
	var y = event.clientY - rect.top - 5;

	for(i=0; i<pointerRects.length; i++) {
		if(x > pointerRects[i].left 
				&& x < pointerRects[i].right 
				&& y > pointerRects[i].top
				&& y < pointerRects[i].bottom) {
			
			canvas.style.cursor = "pointer";
			return;
		}
	}

	canvas.style.cursor = "default";
}

function canvasClick(event) {
	var canvas = document.getElementById("canvas");
	var rect = canvas.getBoundingClientRect();
	var x = event.clientX - rect.left - 5;
	var y = event.clientY - rect.top - 5;

	//console.log('Clicked!');

	for(i=0; i<pointerRects.length; i++) {
		if(x > pointerRects[i].left 
				&& x < pointerRects[i].right 
				&& y > pointerRects[i].top
				&& y < pointerRects[i].bottom) {
			
			//console.log('Clicked on an active item');
			pointerRects[i].action();
			return;
		}
	}
}

/********************************/
/*       Update game            */
/********************************/

var tempusername = "";
var temproomname = "";
var input = null;
var currentroom = "login";
var width = document.getElementById("canvas").width;
var height = document.getElementById("canvas").height;
var roomrefresh = null;
var rolling = null;
var numrolling = 0;

function doRolling() {
	//console.log("Rolling!");
	var canvas = document.getElementById("canvas");
	var context = canvas.getContext('2d');
	var alphabet = ['a', 'b', 'c', 'd'];

	context.clearRect(canvas.width/2 - (numrolling%2)*32 - Math.floor(numrolling/2)*64, canvas.height/2 + 2, numrolling*64, 62);

	for(i=0;i<numrolling;i++){
		var number = Math.floor(Math.random()*6)+1;
		var letter = alphabet[Math.floor(Math.random()*4)];
       	        var image = document.getElementById(number+letter);
             	context.drawImage(image, canvas.width/2 - (numrolling%2)*32 - (Math.floor(numrolling/2)-i)*64, canvas.height/2);
       	}
}

function updateGame() {
	var canvas = document.getElementById("canvas");
	var context = canvas.getContext("2d");
	width = canvas.width;
	height = canvas.height;

	context.clearRect(0, 0, width, height);

	clearInterval(rolling);

	if(roomrefresh != null)
		clearInterval(roomrefresh);

	switch(currentroom) {
		case "login":
			context.font = "42px " + font;
			context.textAlign = "center";
			context.fillStyle = "#050";

			context.fillText("Welcome!", width/2, 100);

			context.strokeStyle = "4px #000000";
			context.fillStyle = "#fc2b2b";

			context.roundedRectangle(150, 150, width-300, height-200, 20, true, true);

			context.fillStyle = "#2b90fc";
			context.roundedRectangle(width/2-100, 200, 200, 200, 100, true, true);

			context.font = "30px " + font;
			context.fillStyle = "#000";
			context.fillText("Who are you?", width/2, 480);

			input = new CanvasInput({
				canvas: canvas,
				x: width/2 - 175 - 8,
				y: 510,
				maxlength: 20,
				fontSize: 24,
				fontFamily: font,
				fontColor: '#000',
				width: 350,
				padding: 8,
				placeHolder: 'Enter username',
				onkeyup: (e, i) => { tempusername = i._value; }
			});

			context.fillStyle = "#2B90fc";
			context.roundedRectangle(width/2-100, 570, 200, 60, 0, true, false);

			context.font = "30px " + font;
			context.fillStyle = "#000";
			context.fillText("That's me!", width/2, 615);

			break;
		case "lobby":
			context.font = "42px " + font;
			context.textAlign = "center";
			context.fillStyle = "#050";

			context.fillText("Hi " + username + "!", width/2, 100);

			context.font = "24px " + font;
			context.fillText("Choose or create a dice table", width/2, 150);

			context.fillStyle = "#fc2b2b";
			context.roundedRectangle(width/2-150, 590, 300, 60, 10, true, true);

			context.fillStyle = "#FFF";
			context.font = "32px " + font;
			context.fillText("Create Table", width/2, 633);

			context.font = "24px " + font;
			context.fillStyle = "#050";
			context.fillText("Forget me", 100, height-30);

			if(roomlist != null) {
				var rooms = roomlist.length;

				if(rooms > 8)
					rooms = 8;

				for(i=0;i<Math.ceil(rooms/2);i++) {
					context.fillStyle = "#DDD";
					context.roundedRectangle(100, 180+i*100, width/2-120, 70, 10, true, true);

					context.fillStyle = "#000";
					context.font = "24px " + font;
					context.textAlign = "left";
					context.fillText(roomlist[i*2].name, 120, 225+i*100);

					context.textAlign = "right";
					context.fillText(roomlist[i*2].players, width/2-40, 225+i*100);

					if(i*2+1<rooms) {
						context.roundedRectangle(width/2+20, 180+i*100, width/2-120, 70, 10, true, true);

						context.fillStyle = "#000";
						context.font = "24px " + font;
						context.textAlign = "left";
						context.fillText(roomlist[i*2+1].name, width/2+40, 225+i*100);

						context.textAlign = "right";
						context.fillText(roomlist[i*2+1].players, width/2-40, 225+i*100);
					}
				}
			}

			roomrefresh = setInterval(()=>{socket.emit('listrooms');}, 1000);

			break;
		case "createroom":
			context.font = "42px " + font;
			context.textAlign = "center";
			context.fillStyle = "#050";

			context.fillText("Hi " + username + "!", width/2, 100);

			context.font = "24px " + font;
			context.fillText("Choose or create a dice table", width/2, 150);

			input = new CanvasInput({
				canvas: canvas,
				x: width/2 - 175 - 8,
				y: 310,
				maxlength: 20,
				fontSize: 24,
				fontFamily: font,
				fontColor: '#000',
				width: 350,
				padding: 8,
				placeHolder: 'Enter table name',
				onkeyup: (e, i) => { temproomname = i._value; }
			});

			context.fillStyle = "#050";
			context.roundedRectangle(width/2-150, 500, 300, 60, 10, true, true);

			context.fillStyle = "#FFF";
			context.font = "32px " + font;
			context.fillText("Start table", width/2, 543);

			context.fillStyle = "#fc2b2b";
			context.roundedRectangle(width/2-150, 590, 300, 60, 10, true, true);

			context.fillStyle = "#FFF";
			context.font = "32px " + font;
			context.fillText("Go Back", width/2, 633);

			context.font = "24px " + font;
			context.fillStyle = "#050";
			context.fillText("Forget me", 100, height-30);
			break;
		case "room":
			context.font = "50px " + font;
			context.textAlign = "center";
			context.fillStyle = "#050";

			context.fillText(roominfo.room.name, width/2, 60);

			context.font = "24px " + font;
			context.fillStyle = "#050";
			context.fillText("Leave room", 100, height-30);

			//console.log(roominfo);

			// Get current player's position in the player list, and angle distribution
			var position = roominfo.room.players.indexOf(userid);
			var angle = 2*Math.PI/roominfo.room.players.length;

			// Now draw all the players!
			for(i=-position;i<-position+roominfo.room.players.length;i++) {
				var x = width/2 - Math.sin(i*angle)*(width/2-130);
				var y = height/2 + Math.cos(i*angle)*(height/2-100);

				if(roominfo.room.currentplayer == roominfo.room.players[position+i])
					context.fillStyle = "#F00";
				else
					context.fillStyle = "#000";
				
				context.font = "24px " + font;
				context.textAlign = "center";
				context.textBaseline = "bottom";
				context.fillText(roominfo.players[roominfo.room.players[position+i]].name, x, y);

				var last = roominfo.players[roominfo.room.players[position+i]].dice;
				var minx = x - (last.length%2)*32 - Math.floor(last.length/2)*64;
				var maxx = minx + last.length*64;

				if(minx < 0 || maxx > width) {
					// The dice flow out of the drawing board. Let them fold
					if(last.length == 4){
						var image = document.getElementById(last[0] + 'a');
						context.drawImage(image, x - 64, y);
						var image = document.getElementById(last[1] + 'a');
						context.drawImage(image, x, y);
						var image = document.getElementById(last[2] + 'a');
						context.drawImage(image, x - 64, y + 64);
						var image = document.getElementById(last[3] + 'a');
						context.drawImage(image, x, y + 64);
					} else if(last.length == 5) {
						var image = document.getElementById(last[0] + 'a');
						context.drawImage(image, x - 32 - 64, y);
						var image = document.getElementById(last[1] + 'a');
						context.drawImage(image, x - 32, y);
						var image = document.getElementById(last[2] + 'a');
						context.drawImage(image, x + 32, y);
						var image = document.getElementById(last[3] + 'a');
						context.drawImage(image, x - 64, y + 64);
						var image = document.getElementById(last[4] + 'a');
						context.drawImage(image, x, y + 64);
					}
				} else {
					for(j=0;j<last.length;j++){
						var image = document.getElementById(last[j] + 'a');
						context.drawImage(image, x - (last.length%2)*32 - (Math.floor(last.length/2)-j)*64, y);
					}
				}
			}

			context.beginPath();
			context.moveTo(width/2-100, height/2);
			context.lineTo(width/2+100, height/2);
			context.stroke();

			// Analyze the dies
			var held = [];
			var notheld = [];

			for(var key in roominfo.room.dice) {
				if(roominfo.room.dice[key].held)
					held.push(key);
				else
					notheld.push(key);
			}

			numrolling = notheld.length;

			if(roominfo.room.dice_rolling) {
				canvas.onclick = null;
				clearInterval(rolling);
				rolling = setInterval(doRolling, 50);
			}
			else {
				canvas.onclick = function(event) {
					canvasClick(event);
				}
				clearInterval(rolling);

				// Draw the normal dice
				for(i=0;i<notheld.length;i++){
					var image = document.getElementById(roominfo.room.dice[notheld[i]].value + 'a');
					context.drawImage(image, width/2 - (notheld.length%2)*32 - (Math.floor(notheld.length/2)-i)*64, height/2);
				}

				// And draw the held dice
				for(i=0;i<held.length;i++){
					var image = document.getElementById(roominfo.room.dice[held[i]].value + 'a');
					context.drawImage(image, width/2 - (held.length%2)*32 - (Math.floor(held.length/2)-i)*64, height/2-64);
				}
			}

			if(roominfo.room.currentplayer == userid) {
				context.fillStyle = "#2b2bfc";
				context.roundedRectangle(width/2-235, 420, 150, 60, 10, true, true);
				context.fillStyle = "#FFF";
				context.font = "32px " + font;
				context.fillText("Clear", width/2-160, 468);

				context.fillStyle = "#fc2b2b";
				context.roundedRectangle(width/2-75, 420, 150, 60, 10, true, true);
				context.fillStyle = "#FFF";
				context.font = "32px " + font;
				context.fillText("Roll", width/2, 468);

				context.fillStyle = "#2bfc2b";
				context.roundedRectangle(width/2+85, 420, 150, 60, 10, true, true);
				context.fillStyle = "#FFF";
				context.font = "32px " + font;
				context.fillText("Done", width/2+160, 468);
			} else {
				context.fillStyle = "#fc2b2b";
				context.roundedRectangle(width/2-75, 420, 150, 60, 10, true, true);
				context.fillStyle = "#FFF";
				context.font = "32px " + font;
				context.fillText("Take", width/2, 468);
			}

			break;
		default:
			currentroom = "login";
	}
}

function gotoLogin() {
	//console.log("Going to login");

	currentroom = "login";

	pointerRects = [];
	pointerRects.push({
		left: width/2-100,
		right: width/2+100,
		top: 200,
		bottom: 400,
		action: () => {  
		}
	});
	pointerRects.push({
		left: width/2-100,
		right: width/2+100,
		top: 570,
		bottom: 630,
		action: () => {
			//console.log("Setting the username to " + tempusername);
			if(tempusername.length > 2) {
				input.destroy();
				socket.emit('username', tempusername);
			}
		}
	});

	updateGame();
}

function gotoLobby() {
	if(username == "") {
		gotoLogin();
		return;
	}

	currentroom = "lobby";

	pointerRects = [];
	pointerRects.push({
		left: width/2-150,
		right: width/2+150,
		top: 590,
		bottom: 650,
		action: () => {
			//console.log("Creating a room");
			gotoCreateRoom();
		}
	});
	pointerRects.push({
		left: 30,
		right: 170,
		top: height-55,
		bottom: height-25,
		action: () => {
			//console.log("Send logout signal");
			socket.emit('logout');
		}
	});

	if(roomlist == null){
		socket.emit('listrooms');
	} else {
		var rooms = roomlist.length;

		//console.log(roomlist);

		if(rooms > 8)
			rooms = 8;

		for(i=0;i<rooms/2;i++) {
			pointerRects.push({
				left: 100,
				right: width/2-20,
				top: 180+i*100,
				bottom: 250+i*100,
				argument: i*2,
				action: function() {
					socket.emit('joinroom', {id: roomlist[this.argument].id});
				}
			});

			if(i*2+1<rooms) {
				pointerRects.push({
					left: width/2+20,
					right: width-100,
					top: 180+i*100,
					bottom: 250+i*100,
					argument: i*2+1,
					action: function() {
						socket.emit('joinroom', {id: roomlist[argument].id});
					}
				});
			}
		}
		
		updateGame();
	}
}

function gotoCreateRoom() {
	//console.log("Creating room");

	if(username == "") {
		gotoLogin();
		return;
	}

	currentroom = "createroom";

	pointerRects = [];
	pointerRects.push({
		left: width/2-150,
		right: width/2+150,
		top: 590,
		bottom: 650,
		action: () => {
			//console.log("Go back to room list");
			input.destroy();
			gotoLobby();
		}
	});
	pointerRects.push({
		left: width/2-150,
		right: width/2+150,
		top: 500,
		bottom: 560,
		action: () => {
			//console.log("Create the room");
			if(temproomname.length > 2) {
				input.destroy();
				socket.emit('createroom', temproomname);
			}
		}
	});
	pointerRects.push({
		left: 30,
		right: 170,
		top: height-55,
		bottom: height-25,
		action: () => {
			//console.log("Send logout signal");
			socket.emit('logout');
		}
	});

	updateGame();
}

function gotoRoom() {
	//console.log("Going to room");
	//console.log(room);

	if(room == null) {
		gotoLobby();
		return;
	}

	currentroom = "room";

	pointerRects = [];
	pointerRects.push({
		left: 30,
		right: 170,
		top: height-55, 
		bottom: height-25,
		action: () => {
			//console.log("Leaving the room");
			socket.emit('leaveroom');
		}
	});

	if(roominfo.room.currentplayer == userid) {
		pointerRects.push({
			left: width/2-75,
			right: width/2+75,
			top: 420,
			bottom: 480,
			action: () => {
				socket.emit('roll');
			}
		});

		pointerRects.push({
			left: width/2-235,
			right: width/2-85,
			top: 420,
			bottom: 480,
			action: () => {
				socket.emit('clear');
			}
		});

		pointerRects.push({
			left: width/2+85,
			right: width/2+235,
			top: 420,
			bottom: 480,
			action: () => {
				socket.emit('done');
			}
		});
	} else {
		pointerRects.push({
			left: width/2-75,
			right: width/2+75,
			top: 420,
			bottom: 480,
			action: () => {
				socket.emit('take');
			}
		});
	}

	if(!roominfo.room.dice_rolling) {
		// Analyze the dies
		var held = [];
		var notheld = [];

		for(var key in roominfo.room.dice) {
			if(roominfo.room.dice[key].held)
				held.push(key);
			else
				notheld.push(key);
		}

		//console.log("Held: " + held + ", unheld: " + notheld)

		for(var i=0;i<held.length;i++) {
			//console.log("Held: " + held[i]);
			pointerRects.push({
				left: width/2 - (held.length%2)*32 - (Math.floor(held.length/2)-i)*64,
			    right: width/2 - (held.length%2)*32 - (Math.floor(held.length/2)-i)*64 + 64,
			    top: height/2-64,
			    bottom: height/2,
			    number: held[i],
			    action: function() {
			    	socket.emit('release', this.number);
			    }
			});
		}

		for(var i=0;i<notheld.length;i++) {
			//console.log("Not held: " + notheld[i]);
			pointerRects.push({
				left: width/2 - (notheld.length%2)*32 - (Math.floor(notheld.length/2)-i)*64,
				right: width/2 - (notheld.length%2)*32 - (Math.floor(notheld.length/2)-i)*64 + 64,
				top: height/2,
				bottom: height/2+64,
				number: notheld[i],
				action: function() {
					socket.emit('hold', this.number);
				}
			});
		}
	}

	updateGame();
}

/********************************/
/*       Socket events          */
/********************************/

socket.on('connect', () => {
	console.log("Connecting to the server");
});

socket.on('playerconnected', (data) => {
	userid = data;

	if(username.length > 2) {
		socket.emit('username', username);
	} else {
		gotoLogin();
	}
});

socket.on('username', (data) => {
	username = data.response;
	setCookie("username", username, 1);

	socket.emit('inroom');
});

socket.on('inroom', (data) => {
	room = data.response;

	if(room != null) {
		socket.emit('joinroom', room);
	} else {
		gotoLobby();
	}
});

socket.on('joinroom', (data) => {
	room = data.room.id;
	roominfo = data;
	setCookie("roomid", room, 1);

	gotoRoom();
});

socket.on('leaveroom', () => {
	// Is this right??
	room = null;
	setCookie('roomid', 0, 0);

	gotoLobby();
});

socket.on('listrooms', (data) => {
	roomlist = data;
	//console.log(roomlist);
	gotoLobby();
});

socket.on('update', (data) => {
	roominfo = data;
	//updateGame();
	gotoRoom();
});

socket.on('logout', () => {
	username = "";
	room = null;
	setCookie("username", "", 0);
	setCookie("roomid", 0, 0);
	gotoLogin();
});
