// Declaring Modules and variables used in file
var fs = require('fs');
var quotes = require('./mugatu-quotes');
var queue;
var present;
var secret;

/* Method to write queue in JSON to db.json file
** @params: array
** @return: void
*/
function backup(queueArray) {
	fs.writeFile('./db.json', JSON.stringify({queue: queueArray}));
}

/* Method to write attendance record in attendance.json file along with the secret word
** @params: array
** @return: void
*/
function backupAttendance(presentArray,secretWord){
	fs.writeFile('./attendance-db.json',JSON.stringify({present: presentArray,secret: secretWord}));
}


/* Try/Catch block to make sure queue is present and formatted correctly 
*/
try {
	queue = JSON.parse(fs.readFileSync('./db.json', 'utf8')).queue;
} catch(e) {
	queue = [];
	backup(queue);
}

/* Try/Catch block to make sure attendance array is present and formatted correctly
*/
try {
	present = JSON.parse(fs.readFileSync('./attendance-db.json','utf8')).present;
} catch(e) {
	present = [];
	secret = "";
	backupAttendance(present,secret);
}

/* Function to return a formatted string of the Help Queue
** @params: null
** @return: String
*/
var prettyQueue = function() {
	
	// Pulling Slack user's real names instead of Slack screen names
	var queueArray = queue.map(function(user) {
		return (queue.indexOf(user) + 1) + ") " + user.real_name ;
	});
	
	// Returning formatted string of queue
	return "*Current Queue*\n" 
		+ (queueArray.length ? queueArray.join("\n") : "*_empty_*");
};


var prettyAttendance = function(){
	var presentArray = present.map(function(user){
		return "- " + user.real_name;
	});
	return "*Attendance*\n"
		+ (presentArray.length ? presentArray.join("\n") : "*_Really?! No one is here today?!_*");
}


module.exports = function(bot, taID, adminID) {
	var mugatubot = function(message, cb) {
		// the if/else if statements are for commands that don't rely
		// on the wording as much
		if (message.type === "message" && message.text !== undefined && message.text.indexOf(bot.mention) > -1) {
			if (message.text.indexOf("status") > -1) {
				bot.sendMessage(message.channel, prettyQueue());

			} else if (message.text.indexOf("queue me") > -1 || message.text.indexOf("q me") > -1) {
				// adding a user to the queue
				if (queue.filter(function(e) {return e.id === message.user}).length === 0) {
					bot.api("users.info", {user: message.user}, function(data) {
						queue.push(data.user);
						console.log("admin: ",adminID);
						// Posts a Mugatu quote if the queue grows to larger than 5
						if( queue.length > 6 ){
							bot.sendMessage(message.channel, quotes['busy'].join( "<@"+taID+">" ) + "\n" + prettyQueue()); 
						} else {
							//var quote = quotes['default'][0];
							var quote = quotes['default'][Math.floor(Math.random()*quotes['default'].length)];
							//console.log(quote);
							if( quote.length > 1 ){
								//console.log('DID IT');
								//console.log(message);
								quote[0] = quote.join('<@'+message.user+'>');
								console.log('quote after join:',quote);
							}
							bot.sendMessage(message.channel, quote[0] + '\n' +  prettyQueue());
						}
						backup(queue);
					});
				} else {
					bot.sendMessage(message.channel, "Already in queue. \n " + prettyQueue());
				}

			} else if (message.text.indexOf("remove me") > -1) {
				// removing a user
				var userToRemove = queue.filter(function(user) {return user.id === message.user});
				if (userToRemove.length) {
					queue.splice(queue.indexOf(userToRemove[0]), 1);
					bot.sendMessage(message.channel, ":wave: \n" + prettyQueue());
					backup(queue);
				}

			} else if (message.text.indexOf("next") > -1 && message.user === taID) {
				// next student
				var currentStudent = queue.shift();
				if (currentStudent) {
					bot.sendMessage(message.channel, "Up now: <@" + currentStudent.id + "> -- \n " + prettyQueue());
					backup(queue);
				}

			} else if (message.text.indexOf("help") > -1) {
				// help message
				bot.sendMessage(message.channel, "All commands work only when you specifically mention me. Type `queue me` or `q me` to queue yourself and `status` to check current queue. Type `remove me` to remove yourself.")

			} else if (message.text.indexOf("clear queue") > -1 && message.user === taID) {
				queue = [];
				bot.sendMessage(message.channel, "Queue cleared");
				backup(queue);
			} else if (message.text.indexOf("attendance") && message.user === adminID){
				console.log(present);
				bot.sendMessage(message.channel, prettyAttendance());
			} else if (message.text.indexOf("secret") && message.user === adminID){
				secret = message.text.split(" ")[1];
				backupAtttendance(present,secret);
				bot.sendMessage(message.channel, "Secret word has been set to " + secret);
			} else if (message.text.indexOf(secret)){
				present.push(data.user);
				backupAttendance(present,secret);
			}
		} else if(message.type === "hello") {
			console.log("Mugatu-Bot connected... NOW GET ME A DAMN LATTE...");
		}
		cb(null, 'core-bot');
	};
	return mugatubot;
};
