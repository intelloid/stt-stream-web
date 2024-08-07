'use strict';

var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var wavesurfer, context, processor;
var ws;
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('language');
var webServerURL = "wss://nlu-00.intelloia.com:38753/intelloid-STT-stream-web/websocket";
if (langParam) webServerURL = webServerURL + "?language=" + langParam;

//show transcribing result text string
function printSttResult(result, status) {
    var resultElement = document.getElementById("sttresult");
    if (status == "FINAL") {
        resultElement.style.color = "black";	
    } else if (status == "PARTIAL") {
        resultElement.style.color = "gray";	
    } else if (status == "FINAL_A1") {
        resultElement.style.color = "blue";	
        //resultElement.style.fontWeight = "bold";
    }
    resultElement.innerHTML = result;	
}

// Init & load
document.addEventListener('DOMContentLoaded', function() {
    var micBtn = document.querySelector('#micBtn');
        
    micBtn.onclick = function() {
        
        if (wavesurfer === undefined) {
            if (isSafari) {
                // Safari 11 or newer automatically suspends new AudioContext's that aren't
                // created in response to a user-gesture, like a click or tap, so create one
                // here (inc. the script processor)
                var AudioContext =
                    window.AudioContext || window.webkitAudioContext;
                context = new AudioContext({
							sampleRate: 16000,
						});
                processor = context.createScriptProcessor(4096, 1, 1);
            }

            // Init wavesurfer
            wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'black',
                interact: false,
                cursorWidth: 0,
                audioContext: context || null,
                audioScriptProcessor: processor || null,
                plugins: [
                    WaveSurfer.microphone.create({
                        bufferSize: 4096,
                        numberOfInputChannels: 1,
                        numberOfOutputChannels: 1,
                        constraints: {
                            video: false,
                            audio: true
                        }
                    })
                ]
            });
	
			wavesurfer.microphone.on('deviceReady', function(stream) {
				console.info('Device ready!', stream);
            });

           	ws = new WebSocket(webServerURL);
           	/* ws.binaryType = "arraybuffer"; */
	        ws.onmessage = function(event) {
		        if(event.data != ""){
			        console.info(event.data);
			        const obj = JSON.parse(event.data);
			        if(obj.status == "FINAL" || obj.status == "PARTIAL" || obj.status == "FINAL_A1") {
			        	if(obj.results[0].sentence != 0) {
							printSttResult(obj.results[0].sentence, obj.status);
							var result = obj.results[0].sentence;
							console.info(result);
							if(result.includes("stop") == true) micBtn.click();							
						}
					}
				}
	        }
        
			wavesurfer.microphone.on('pcmReady', function(b64) {
				//console.info('pcmReady', b64);
				ws.send(b64);
			});
				
            wavesurfer.microphone.on('deviceError', function(code) {
                console.warn('Device error: ' + code);
            });
            wavesurfer.on('error', function(e) {
                console.warn(e);
            });
            wavesurfer.microphone.start();
        } else {
            // start/stop mic on button click
            if (wavesurfer.microphone.active) {
                wavesurfer.microphone.stop();
				ws.close();
            } else {
                wavesurfer.microphone.start();
                ws = new WebSocket(webServerURL);
                /* ws.binaryType = "arraybuffer"; */
             	ws.onmessage = function(event) {
					if(event.data != "") {
				        console.info(event.data);
				        const obj = JSON.parse(event.data);
				        if(obj.status == "FINAL" || obj.status == "PARTIAL" || obj.status == "FINAL_A1") {
							if(obj.results[0].sentence != "") 
								printSttResult(obj.results[0].sentence, obj.status);
						}
					}
			    }
            }
        }
    };
});
