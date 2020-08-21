/********************************/
/*    Importing dependencies    */
/********************************/

// TODO: move all response codes to a single function, so it's the same everywhere

var express_import = require('express');
var express = express_import();
var server = require('http').Server(express);
var io = require('socket.io')(server);
var path = require('path');

require('log-timestamp')(function() {
	return '[' + new Date().toLocaleString() + '] %s';
});

/********************************/
/*        Server setup          */
/********************************/

var port = 5004;

// Set default settings for the express app
express.set('port', port);
express.use('/static', express_import.static(__dirname + '/static'));

// Set some default responses to URL requests
express.get('/', (request, response) => {
	response.sendFile(path.join(__dirname, 'index.html'));
});
express.get('/admin', (request, response) => {
	response.sendFile(path.join(__dirname, 'admin.html'));
});

// Start the HTTP server
server.listen(port, '0.0.0.0', () => {
	console.log('Starting server on port ' + port);
});

/********************************/
/*      Class definitions       */
/********************************/

var Player = function(id) {
	var self = {
		id: "",
		ip: "",
		name: "Anonimuis",
		room: null,
		dice: [2,4],
		active: true
	}
	
	self.id = id;

	Player.list[id] = self;
	return self;
}

var Room = function(id) {
	var self = {
		id: "",
		name: "Mextafel",
		no_dice: 2,
		dice_rolling: false,
		dice: {
			'0': {
				value: Math.floor(Math.random() * 6) + 1,
				held: false
			},
			'1': {
				value: Math.floor(Math.random() * 6) + 1,
				held: false
			}
		},
		players: [],
		currentplayer: null
	}

	self.id = id;

	Room.list[id] = self;
	return self;
}

function uuidv4() {
  return 'xxxxxxxx4xxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/********************************/
/*        Event handling        */
/********************************/

var SOCKET_LIST = {};
Player.list = {};
Room.list = {};

Player.onConnect = function(socket) {
	var player = Player(socket.id);

	// Handling player events
	socket.on('username', (data) => {
		console.log("Setting player username to: " + data);
		Player.list[player.id].name = data.substring(0, 20);

		socket.emit('username', {response: Player.list[player.id].name});
	});

	socket.on('logout', () => {
		console.log("Logout request received for user " + Player.list[player.id].name);
		Player.list[player.id].name = "";
		Player.list[player.id].dice = {};
		Player.list[player.id].active = false;

		// TODO: More here. It's not nicely cleaning

		socket.emit('logout');
	});

	// The user wants to create a room
	socket.on('createroom', (data) => {
		// TODO: Limit number of rooms. To something like 8.
		// Create the room
		var room = Room(uuidv4());
		Room.list[room.id].name = data
		console.log(Player.list[player.id].name + " created room with id " + room.id + " and name " + data);

		Player.list[player.id].room = room.id;
		room.players.push(player.id);
		Room.list[room.id].currentplayer = player.id;

		socket.join(room.id, () => {
			var response = {room: Room.list[room.id], players: {}};
			for(id of Room.list[room.id].players) {
				if(Player.list[id].active)
					response['players'][id] = Player.list[id];
			}

			socket.emit('joinroom', response);
			for(id of Room.list[room.id].players) {
				SOCKET_LIST[id].emit('update', response);
			}
		});
	});

	// The user wants to leave a room
	socket.on('leaveroom', (data) => {
		socket.leave(player.room);

		console.log(Player.list[player.id].name + " is leaving room " + Room.list[Player.list[player.id].room].name);

		Room.list[player.room].players = Room.list[player.room].players.filter(e => e !== player.id);

		if(Room.list[player.room].players.length == 0){
			delete Room.list[Player.list[player.id].room];
		} else {
			Player.sendUpdate(player.id);
		}

		Player.list[player.id].room = null;

		socket.emit('leaveroom');
	});

	// The user wants to join a room
	socket.on('joinroom', (data) => {
		if(Room.list[data.id] != undefined) {
			Player.list[player.id].room = data.id;
			Room.list[data.id].players.push(player.id);

			socket.join(data.id);

			var response = {room: Room.list[data.id], players: {}};
			for(id of Room.list[data.id].players) {
				if(Player.list[id].active)
					response['players'][id] = Player.list[id];
			}

			socket.emit('joinroom', response);
			for(id of Room.list[data.id].players) {
				SOCKET_LIST[id].emit('update', response);
			}

			console.log(Player.list[player.id].name + " joins room " + Room.list[data.id].name);
		}
	});

	// Is the user in a room?
	socket.on('inroom', () => {
		socket.emit('inroom', {response: Player.list[player.id].room});
	});

	// Get a list of all the rooms
	socket.on('listrooms', (data) => {
		var response = [];

		for(id in Room.list) {
			response.push({id: id, name: Room.list[id].name, players: Room.list[id].players.length});
		}
		
		socket.emit('listrooms', response);
	});

	socket.on('hold', (data) => {
		if(Room.list[Player.list[player.id].room].dice[data] != undefined) {
			Room.list[Player.list[player.id].room].dice[data].held = true;

			Player.sendUpdate(player.id);
		}
	});

	socket.on('release', (data) => {
		if(Room.list[Player.list[player.id].room].dice[data] != undefined) {
			Room.list[Player.list[player.id].room].dice[data].held = false;
			
			Player.sendUpdate(player.id);
		}
	});

	socket.on('roll', () => {
		Room.list[Player.list[player.id].room].dice_rolling = true;

		Player.sendUpdate(player.id);

		setTimeout(function() {
			Room.list[Player.list[player.id].room].dice_rolling = false;

			for(var die in Room.list[Player.list[player.id].room].dice) {
				if(!Room.list[Player.list[player.id].room].dice[die].held) {
					Room.list[Player.list[player.id].room].dice[die].value = Math.floor(Math.random()*6)+1;
				}
			}

			Player.list[player.id].dice = [];

			for(var die in Room.list[Player.list[player.id].room].dice) {
				Player.list[player.id].dice.push(Room.list[Player.list[player.id].room].dice[die].value);
			}

			Player.sendUpdate(player.id);
		}, 2000);
	});

	socket.on('clear', function() {
		for(id of Room.list[Player.list[player.id].room].players) {
			Player.list[id].dice = [];
		}

		for(var die in Room.list[Player.list[player.id].room].dice) {
			Room.list[Player.list[player.id].room].dice[die].held = false;
		}

		Player.sendUpdate(player.id);
	});

	socket.on('done', function() {
		// Get our own position in that list
		var position = Room.list[Player.list[player.id].room].players.indexOf(Room.list[Player.list[player.id].room].currentplayer);

		if(position == Room.list[Player.list[player.id].room].players.length - 1)
			Room.list[Player.list[player.id].room].currentplayer = Room.list[Player.list[player.id].room].players[0];
		else
			Room.list[Player.list[player.id].room].currentplayer = Room.list[Player.list[player.id].room].players[position+1];

		for(var die in Room.list[Player.list[player.id].room].dice) {
			Room.list[Player.list[player.id].room].dice[die].held = false;
		}

		Player.sendUpdate(player.id);
	});

	socket.on('take', function() {
		Room.list[Player.list[player.id].room].currentplayer = player.id;

		for(var die in Room.list[Player.list[player.id].room].dice) {
			Room.list[Player.list[player.id].room].dice[die].held = false;
		}

		Player.sendUpdate(player.id);
	});

	// Now send the user a message that connecting was successful
	socket.emit('playerconnected', player.id);
}

Player.sendUpdate = function(id) {
	var response = {room: Room.list[Player.list[id].room], players: {}};

	for(id of Room.list[Player.list[id].room].players) {
		if(Player.list[id].active) {
			response.players[id] = Player.list[id];
		}
	}

	for(id of Room.list[Player.list[id].room].players) {
		SOCKET_LIST[id].emit('update', response);
	}
}

Player.onDisconnect = function(socket) {
	// TODO: If disconnecting, only set the user to inactive
	// TODO: Implement a way to clean up users and rooms on a regular basis (setInterval)
	delete Player.list[socket.id];
}

/********************************/
/*       Socket handling        */
/********************************/

io.on('connection', (socket) => {
	console.log('A player connected');

	socket.id = Math.random(); // Is this necessary??
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);

	socket.on('disconnect', () => {
		console.log('A player disconnected');

		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
});
