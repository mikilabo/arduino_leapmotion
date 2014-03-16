/**
 * Initialize
 */
var leap = require('leapjs'),
    app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    path = require('path'),
    serialport = require('serialport');

io.set('log level', 2);

// Serial Port setting
var portName = '/dev/cu.usbserial-AD0267I2'; 
var sp = new serialport.SerialPort(portName, {
    baudRate: 57600,
    parser: serialport.parsers.readline("\n"),
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
});

/**
 * Web server handler
 */
app.listen(3000);
function handler(req, res){

	var filePath = req.url;

	if (filePath == '/') {
		filePath = '/index.html';
	} else {
		filePath = req.url;
	}
	//console.log(filePath);
	var extname = path.extname(filePath);
	//console.log("filePath: " + filePath);
	//console.log("ext: " + extname);

	//contentType switching
	var contentType = 'text/html';
	switch (extname) {
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
	}
	console.log(contentType);

	//console.log(__dirname + filePath);
	fs.readFile(__dirname + filePath, function(err, data){
		if(err){
			res.writeHead(500);
			return res.end('Error');
		}
		res.setHeader('Content-Type', contentType);
		res.writeHead(200);
		res.write(data);
		res.end();
	});
}

/**
 * leapmotion controller
 */
var controller = new leap.Controller({
  enableGestures: true,
  frameEventName: 'deviceFrame'
});

/**
 * For DEBUG: Vector -> String
 */
function vectorToString(vector, digits) {
  if (typeof digits === "undefined") {
    digits = 1;
  }
	
  return "(x:" + vector[0].toFixed(digits) + "mm, y:"
             + vector[1].toFixed(digits) + "mm, z:"
             + vector[2].toFixed(digits) + "mm)";
}

/**
 * send data to Serialport(Arduino)
 */
function sendToArduino( name, power ){
	var data = JSON.stringify({"name": name,
					"power": power
					});

	sp.write(data + "\n", function(err, results) {
		//console.log('bytes written: ', results);
		console.log("data = " + data);
	});
}

/**
 * Send data to Serialport(Arduino) and Socket.io client
 * if control == 0 then sending Stop to serial
 */
function sendToArduinoAndWeb( socket, control, direction, power){

	socket.broadcast.emit('emit_from_server_dir', JSON.stringify({"direction": direction}));

	if(control){
		sendToArduino(direction, power);
	}else{
		sendToArduino("Stop", power);
	}
}

/**
  get command from hand position
  -10cm <= x <= 10cm : stop
  -5cm <= z <= 5cm : stop
  y <= 10cm : power->0
  y >= 50cm : power->244
 */
var previous_power = 0;
function get_command(hand, socket, control){

	var x_axis = hand.palmPosition[0];
	var y_axis = hand.palmPosition[1];
	var z_axis = hand.palmPosition[2];

	//console.log("prev_y = " + previous_y + ",  y = " + y_axis);
	var power = 0;
	if( y_axis <= 100 ){
		power = 0;
	}else if( y_axis >= 500 ){
		power = 244;
	}else{
		power = ((y_axis-50)/(500-100) * 244).toFixed(0);
	}
	console.log("power = " + power);
	socket.broadcast.emit('emit_from_server_pw', JSON.stringify({"power": power}));

	/**
	 *
	 */
    if( Math.abs(x_axis) > Math.abs(z_axis) ){
		//right left control

		if( x_axis > 100 ){
			//sends right direction
			console.log("---> right");
			sendToArduinoAndWeb( socket, control, "Right", power);
		}else if( x_axis < -10 ){
			//sends left direction
			sendToArduinoAndWeb( socket, control, "Left", power);
			console.log("---> left");
		}else{
			sendToArduinoAndWeb( socket, control, "Stop", power);
			console.log("--->Stop");
		}
	}else{
		//front back control
		if( z_axis > 50 ){
			//sends back direction
			sendToArduinoAndWeb( socket, control, "Back", power);
			console.log("---> back");
		}else if( z_axis < -50 ){
			//sends front direction
			sendToArduinoAndWeb( socket, control, "Go", power);
			console.log("---> go ");
		}else{
			//sends stop
			sendToArduinoAndWeb( socket, control, "Stop", power);
			console.log("--->Stop");
		}
	}

	previous_power = power;
}

//counter for leapmotion
var counter = 0;
var nohands_flag = 0;

/**
 * socket.io part
 */
io.sockets.on('connection', function(socket){
	/**
	 * leapmotion のframe情報受け取り部分は
	 * socketを受け取った後に定義する
	 */
	controller.on("frame", function(frame) {
		var hand = frame.hands[0];

		/**
		 * Policy
		 * no hands : Control:off, WebScreen:stop, 			arduino:stop
		 * finger<2 : Control:off, WebScreen:hand position, arduino:stop
		 * else     : Control:on , WebScreen:hand position, arduino:hand position
		 */

		// No Hand
		if( frame.hands.length < 1 ){

			//for ddebug
			if( nohands_flag == 0 ){
				console.log("control off");
				console.log();
			}
			nohands_flag = 1;

			//Send Stop to Arduino
			sendToArduino("Stop", 0);

			//Send OFF to Web
			socket.broadcast.emit('emit_from_server_control', JSON.stringify({"control": 0}));
		
			//Send Stop to Web
			socket.broadcast.emit('emit_from_server_dir', JSON.stringify({"direction": "stop"}));

			return;
		}

		//finger < 2 
		if( hand.pointables.length < 2 ){
			//WebScreen:hand position, Arduino:Stop
			control = 0;
			socket.broadcast.emit('emit_from_server_control', JSON.stringify({"control": 0}));
		}else{
			//WebScreen:hand position, Arduino:hand position
			control = 1;
			socket.broadcast.emit('emit_from_server_control', JSON.stringify({"control": 1}));
		}

		nohands_flag = 0;
		counter++;
		//check the hand property every 5 frames
		if(counter == 5 ){
			//console.log("Frame: " + frame.id + " @ " + frame.timestamp);
			//console.log("Parm Direction: " + vectorToString(hand.direction, 2));
			//console.log("Parm normal: " + vectorToString(hand.palmNormal, 2));
			//console.log("Parm stabilized position: " + vectorToString(hand.stabilizedPalmPosition));
			//console.log("counter = " + counter);

			counter = 0;
			console.log("Parm position: " + vectorToString(hand.palmPosition));

			//get hand position
			get_command( hand, socket, control);
			console.log();
		}

	});
});


/**
 * forleapmotion
 */
controller.on('ready', function() {
    console.log("ready");
});
controller.on('connect', function() {
    console.log("connect");
});
controller.on('disconnect', function() {
    console.log("disconnect");
});
controller.on('focus', function() {
    console.log("focus");
});
controller.on('blur', function() {
    console.log("blur");
});
controller.on('deviceConnected', function() {
    console.log("deviceConnected");
});
controller.on('deviceDisconnected', function() {
    console.log("deviceDisconnected");
});

controller.connect();
console.log("\nWaiting for device to connect...");

sp.on('close', function(err) {
    console.log('port closed');
});

//serialport open
sp.open(function () {
  console.log('port open');
});

