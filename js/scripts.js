
$(function(){
    var socket = io.connect();
	var lastCmd = "Stop"; //default

	//power data from server
	socket.on('emit_from_server_pw', function(data){
		console.log("from_server power : " + data);
		var power = JSON.parse(data).power;
		$("#slider").slider("value",power)
		//$('#defaultSlider').val(power);
		$('#slideValue').val(power);
	});

	//slider
	$("#slider").slider({
		range: "max",
		min: 0,
		max: 244,
		value: 150,

		//default
		create: function( event, ui ) {
			$('#slideValue').val(150);
			console.log("create val : " + 150);
		},
		//change slider
		slide: function( event, ui ) {
			console.log("slider val : " + ui.value);
			$('#slideValue').val(ui.value);
			socket.emit('emit_from_client_pw', {power : ui.value});
		},
		//slider change done
		stop: function( event, ui ) {
			console.log("stop val : " + ui.value);
			sendToServer(lastCmd, $('#slideValue').val());
		}
	});


	socket.on('emit_from_server_control', function(data){
		//console.log("control : " + data);
		var control = JSON.parse(data).control;

		if(control == 1 ) {
			//control on 
			$("#control").text("ON");
			$("#control").css("background","#87ceeb");
		} else{
			//control off 
			$("#control").text("OFF");
			$("#control").css("background","#f5f5f5");
		}

	});

	//leapmotionからの方向
	socket.on('emit_from_server_dir', function(data){
		//console.log("direction : " + data);
		var direction = JSON.parse(data).direction;

		//一端初期化
		$("#go").css("background","#f5f5f5");
		$("#back").css("background","#f5f5f5");
		$("#right").css("background","#f5f5f5");
		$("#left").css("background","#f5f5f5");
		$("#stop").css("background","#f5f5f5");

		if( direction == "Go"){
			$("#go").css("background","#87ceeb");
		}else if( direction == "Back"){
			$("#back").css("background","#87ceeb");
		}else if( direction == "Right"){
			$("#right").css("background","#87ceeb");
		}else if( direction == "Left"){
			$("#left").css("background","#87ceeb");
		}else{
			//stop
			$("#stop").css("background","#fe7f11");
		}

	});

});

