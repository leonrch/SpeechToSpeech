(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// global variables
window.audioIn = null;
window.baseString = '';

var utils = require('./utils');
/**
 * Captures microphone input from the browser.
 * Works at least on latest versions of Firefox and Chrome
 */
function Microphone(_options) {
  var options = _options || {};

  // we record in mono because the speech recognition service
  // does not support stereo.
  this.bufferSize = options.bufferSize || 8192;
  this.inputChannels = options.inputChannels || 1;
  this.outputChannels = options.outputChannels || 1;
  this.recording = false;
  this.requestedAccess = false;
  this.sampleRate = 16000;
  // auxiliar buffer to keep unused samples (used when doing downsampling)
  this.bufferUnusedSamples = new Float32Array(0);

  // Chrome or Firefox or IE User media
  if (!navigator.getUserMedia) {
    navigator.getUserMedia = navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia;
  }

}

/**
 * Called when the user reject the use of the michrophone
 * @param  error The error
 */
Microphone.prototype.onPermissionRejected = function() {
  console.log('Microphone.onPermissionRejected()');
  this.requestedAccess = false;
  this.onError('Permission to access the microphone rejeted.');
};

Microphone.prototype.onError = function(error) {
  console.log('Microphone.onError():', error);
};

/**
 * Called when the user authorizes the use of the microphone.
 * @param  {Object} stream The Stream to connect to
 *
 */
Microphone.prototype.onMediaStream =  function(stream) {
  var AudioCtx = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtx)
    throw new Error('AudioContext not available');

  if (!this.audioContext)
    this.audioContext = new AudioCtx();

  var gain = this.audioContext.createGain();
  var audioInput = this.audioContext.createMediaStreamSource(stream);

  audioInput.connect(gain);

  this.mic = this.audioContext.createScriptProcessor(this.bufferSize,
    this.inputChannels, this.outputChannels);

  // uncomment the following line if you want to use your microphone sample rate
  //this.sampleRate = this.audioContext.sampleRate;
  console.log('Microphone.onMediaStream(): sampling rate is:', this.sampleRate);

  this.mic.onaudioprocess = this._onaudioprocess.bind(this);
  this.stream = stream;

  gain.connect(this.mic);
  this.mic.connect(this.audioContext.destination);
  this.recording = true;
  this.requestedAccess = false;
  this.onStartRecording();
};

/**
 * callback that is being used by the microphone
 * to send audio chunks.
 * @param  {object} data audio
 */
Microphone.prototype._onaudioprocess = function(data) {
  if (!this.recording) {
    // We speak but we are not recording
    return;
  }

  // Single channel
  var chan = data.inputBuffer.getChannelData(0);

  this.onAudio(this._exportDataBufferTo16Khz(new Float32Array(chan)));

  //export with microphone mhz, remember to update the this.sampleRate
  // with the sample rate from your microphone
  // this.onAudio(this._exportDataBuffer(new Float32Array(chan)));

};

/**
 * Start the audio recording
 */
Microphone.prototype.record = function() {
  if (!navigator.getUserMedia){
    this.onError('Browser doesn\'t support microphone input');
    return;
  }
  if (this.requestedAccess) {
    return;
  }

  this.requestedAccess = true;
  navigator.getUserMedia({ audio: true },
    this.onMediaStream.bind(this), // Microphone permission granted
    this.onPermissionRejected.bind(this)); // Microphone permission rejected
};

/**
 * Stop the audio recording
 */
Microphone.prototype.stop = function() {
  if (!this.recording)
    return;
  this.recording = false;
  // this.stream.stop();
  this.requestedAccess = false;
  this.mic.disconnect(0);
  this.mic = null;
  this.onStopRecording();
};

/**
 * Creates a Blob type: 'audio/l16' with the chunk and downsampling to 16 kHz
 * coming from the microphone.
 * Explanation for the math: The raw values captured from the Web Audio API are
 * in 32-bit Floating Point, between -1 and 1 (per the specification).
 * The values for 16-bit PCM range between -32768 and +32767 (16-bit signed integer).
 * Multiply to control the volume of the output. We store in little endian.
 * @param  {Object} buffer Microphone audio chunk
 * @return {Blob} 'audio/l16' chunk
 * @deprecated This method is depracated
 */
Microphone.prototype._exportDataBufferTo16Khz = function(bufferNewSamples) {
  var buffer = null,
    newSamples = bufferNewSamples.length,
    unusedSamples = this.bufferUnusedSamples.length;

  if (unusedSamples > 0) {
    buffer = new Float32Array(unusedSamples + newSamples);
    for (var i = 0; i < unusedSamples; ++i) {
      buffer[i] = this.bufferUnusedSamples[i];
    }
    for (i = 0; i < newSamples; ++i) {
      buffer[unusedSamples + i] = bufferNewSamples[i];
    }
  } else {
    buffer = bufferNewSamples;
  }

  // downsampling variables
  var filter = [
      -0.037935, -0.00089024, 0.040173, 0.019989, 0.0047792, -0.058675, -0.056487,
      -0.0040653, 0.14527, 0.26927, 0.33913, 0.26927, 0.14527, -0.0040653, -0.056487,
      -0.058675, 0.0047792, 0.019989, 0.040173, -0.00089024, -0.037935
    ],
    samplingRateRatio = this.audioContext.sampleRate / 16000,
    nOutputSamples = Math.floor((buffer.length - filter.length) / (samplingRateRatio)) + 1,
    pcmEncodedBuffer16k = new ArrayBuffer(nOutputSamples * 2),
    dataView16k = new DataView(pcmEncodedBuffer16k),
    index = 0,
    volume = 0x7FFF, //range from 0 to 0x7FFF to control the volume
    nOut = 0;

  for (var i = 0; i + filter.length - 1 < buffer.length; i = Math.round(samplingRateRatio * nOut)) {
    var sample = 0;
    for (var j = 0; j < filter.length; ++j) {
      sample += buffer[i + j] * filter[j];
    }
    sample *= volume;
    dataView16k.setInt16(index, sample, true); // 'true' -> means little endian
    index += 2;
    nOut++;
  }

  var indexSampleAfterLastUsed = Math.round(samplingRateRatio * nOut);
  var remaining = buffer.length - indexSampleAfterLastUsed;
  if (remaining > 0) {
    this.bufferUnusedSamples = new Float32Array(remaining);
    for (i = 0; i < remaining; ++i) {
      this.bufferUnusedSamples[i] = buffer[indexSampleAfterLastUsed + i];
    }
  } else {
    this.bufferUnusedSamples = new Float32Array(0);
  }

  return new Blob([dataView16k], {
    type: 'audio/l16'
  });
  };

/**
 * Creates a Blob type: 'audio/l16' with the
 * chunk coming from the microphone.
 */
var exportDataBuffer = function(buffer, bufferSize) {
  var pcmEncodedBuffer = null,
    dataView = null,
    index = 0,
    volume = 0x7FFF; //range from 0 to 0x7FFF to control the volume

  pcmEncodedBuffer = new ArrayBuffer(bufferSize * 2);
  dataView = new DataView(pcmEncodedBuffer);

  /* Explanation for the math: The raw values captured from the Web Audio API are
   * in 32-bit Floating Point, between -1 and 1 (per the specification).
   * The values for 16-bit PCM range between -32768 and +32767 (16-bit signed integer).
   * Multiply to control the volume of the output. We store in little endian.
   */
  for (var i = 0; i < buffer.length; i++) {
    dataView.setInt16(index, buffer[i] * volume, true);
    index += 2;
  }

  // l16 is the MIME type for 16-bit PCM
  return new Blob([dataView], { type: 'audio/l16' });
};

Microphone.prototype._exportDataBuffer = function(buffer){
  utils.exportDataBuffer(buffer, this.bufferSize);
};


// Functions used to control Microphone events listeners.
Microphone.prototype.onStartRecording =  function() {};
Microphone.prototype.onStopRecording =  function() {};
Microphone.prototype.onAudio =  function() {};

module.exports = Microphone;


},{"./utils":7}],2:[function(require,module,exports){
module.exports={
   "models": [
      // {
      //    "name": "pt-BR_NarrowbandModel",
      //    "language": "pt-BR",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/pt-BR_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": false,
      //       "speaker_labels": false
      //    },
      //    "description": "Brazilian Portuguese narrowband model."
      // },
      {
         "name": "fr-FR_BroadbandModel",
         "language": "fr-FR",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/fr-FR_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": false,
            "speaker_labels": false
         },
         "description": "French"
      },
      // {
      //    "name": "en-US_NarrowbandModel",
      //    "language": "en-US",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/en-US_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": true,
      //       "speaker_labels": true
      //    },
      //    "description": "US English narrowband model."
      // },
      // Give preference to US English
      // {
      //    "name": "en-GB_BroadbandModel",
      //    "language": "en-GB",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/en-GB_BroadbandModel",
      //    "rate": 16000,
      //    "supported_features": {
      //       "custom_language_model": false,
      //       "speaker_labels": false
      //    },
      //    "description": "GB English broadband model."
      // },
      {
         "name": "zh-CN_BroadbandModel",
         "language": "zh-CN",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/zh-CN_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": false,
            "speaker_labels": false
         },
         "description": "Mandarin Chinese"
      },
      {
         "name": "ja-JP_BroadbandModel",
         "language": "ja-JP",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/ja-JP_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": true,
            "speaker_labels": true
         },
         "description": "Japanese"
      },
      // {
      //    "name": "en-GB_NarrowbandModel",
      //    "language": "en-GB",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/en-GB_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": false,
      //       "speaker_labels": false
      //    },
      //    "description": "GB English narrowband model."
      // },
      {
         "name": "es-ES_BroadbandModel",
         "language": "es-ES",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/es-ES_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": true,
            "speaker_labels": true
         },
         "description": "Spanish"
      },
      {
         "name": "ar-AR_BroadbandModel",
         "language": "ar-AR",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/ar-AR_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": false,
            "speaker_labels": false
         },
         "description": "Arabic"
      },
      // {
      //    "name": "zh-CN_NarrowbandModel",
      //    "language": "zh-CN",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/zh-CN_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": false,
      //       "speaker_labels": false
      //    },
      //    "description": "Mandarin narrowband model."
      // },
      // {
      //    "name": "ja-JP_NarrowbandModel",
      //    "language": "ja-JP",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/ja-JP_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": true,
      //       "speaker_labels": true
      //    },
      //    "description": "Japanese narrowband model."
      // },
      // {
      //    "name": "es-ES_NarrowbandModel",
      //    "language": "es-ES",
      //    "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/es-ES_NarrowbandModel",
      //    "rate": 8000,
      //    "supported_features": {
      //       "custom_language_model": true,
      //       "speaker_labels": true
      //    },
      //    "description": "Spanish narrowband model."
      // },
      {
         "name": "pt-BR_BroadbandModel",
         "language": "pt-BR",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/pt-BR_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": false,
            "speaker_labels": false
         },
         "description": "Brazilian Portuguese"
      },
      {
         "name": "en-US_BroadbandModel",
         "language": "en-US",
         "url": "https://stream.watsonplatform.net/speech-to-text/api/v1/models/en-US_BroadbandModel",
         "rate": 16000,
         "supported_features": {
            "custom_language_model": true,
            "speaker_labels": true
         },
         "description": "English"
      }
   ]
}

},{}],3:[function(require,module,exports){

var effects = require('./views/effects');
var display = require('./views/displaymetadata');
var hideError = require('./views/showerror').hideError;
var initSocket = require('./socket').initSocket;

exports.handleFileUpload = function(token, model, file, contentType, callback, onend) {

    // Set currentlyDisplaying to prevent other sockets from opening
    localStorage.setItem('currentlyDisplaying', true);

    // $('#progressIndicator').css('visibility', 'visible');

    $.subscribe('progress', function(evt, data) {
      console.log('progress: ', data);
    });

    console.log('contentType', contentType);

    baseString = '';

    var options = {};
    options.token = token;
    options.message = {
      'action': 'start',
      'content-type': contentType,
      'interim_results': true,
      'continuous': true,
      'word_confidence': true,
      'timestamps': true,
      'max_alternatives': 3
    };
    options.model = model;

    function onOpen(socket) {
      console.log('Socket opened');
    }

    function onListening(socket) {
      console.log('Socket listening');
      callback(socket);
    }

    function onMessage(msg) {
      if (msg.results) {
        // Converted to closure approach
        display.showResult(msg);
      }
    }

    function onError(evt) {
      localStorage.setItem('currentlyDisplaying', false);
      onend(evt);
      console.log('Socket err: ', evt.code);
    }

    function onClose(evt) {
      localStorage.setItem('currentlyDisplaying', false);
      onend(evt);
      console.log('Socket closing: ', evt);
    }

    initSocket(options, onOpen, onListening, onMessage, onError, onClose);

  }
},{"./socket":6,"./views/displaymetadata":9,"./views/effects":11,"./views/showerror":18}],4:[function(require,module,exports){

'use strict';

var initSocket = require('./socket').initSocket;
var display = require('./views/displaymetadata');

exports.handleMicrophone = function(token, model, mic, callback) {

  if (model.indexOf('Narrowband') > -1) {
    var err = new Error('Microphone transcription cannot accomodate narrowband models, please select another');
    callback(err, null);
    return false;
  }

  $.publish('clearscreen');

  // Test out websocket
  baseString = '';

  var options = {};
  options.token = token;
  options.message = {
    'action': 'start',
    'content-type': 'audio/l16;rate=16000',
    'interim_results': true,
    'continuous': true,
    'word_confidence': true,
    'timestamps': true,
    'max_alternatives': 3
  };
  options.model = model;

  function onOpen(socket) {
    console.log('Mic socket: opened');
    callback(null, socket);
  }

  function onListening(socket) {

    mic.onAudio = function(blob) {
      if (socket.readyState < 2) {
        socket.send(blob)
      }
    };
  }

  function onMessage(msg, socket) {
    console.log('Mic socket msg: ', msg);
    if (msg.results) {
      // Converted to closure approach
      display.showResult(msg);
    }
  }

  function onError(r, socket) {
    console.log('Mic socket err: ', err);
  }

  function onClose(evt) {
    console.log('Mic socket close: ', evt);
  }

  initSocket(options, onOpen, onListening, onMessage, onError, onClose);

}
},{"./socket":6,"./views/displaymetadata":9}],5:[function(require,module,exports){
/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*global $:false */

'use strict';

var Microphone = require('./Microphone');
var models = require('./data/models.json').models;
var utils = require('./utils');
utils.initPubSub();
var initViews = require('./views').initViews;

window.BUFFERSIZE = 8192;

function getServerModels(token) {
  var url = '/api/models';
  var sttModels = models;
  var modelRequest = new XMLHttpRequest();
  modelRequest.open("GET", url, true);

  modelRequest.onload = function(evt) {
    //console.log("response to "+url+ ": "+modelRequest.responseText);
    var nmtModels = JSON.parse(modelRequest.responseText);

    // turn sttModels array into map for easy lookup table
    var sttModelMap = {};
    for (var i=0; i<sttModels.length; i++) {
      var lang = sttModels[i].language;
      var slang = lang.substring(0,2);
      //console.log(Lang "+i+" is "+lang+" shortened to "+slang);
      if (sttModelMap[slang]) {
        console.warn("Lang code "+slang+" is doubly defined at "+sttModelMap[slang]+" and "+i);
      } else {
        //console.log("Adding language "+slang+" to map at position "+i+" in array");
        sttModelMap[slang] = i;
      }
    }

    // Iterate through the various translation models and see if we can translate from languages not on our sstModel liste
    var transLangs = {};  // A structure to store the model_ids for each lanugage pair
    var langCodeMap = {}; // at same time build a map of language code to name
    var langNameMap = {}; // at same time build a map of language name to code

    // Iterate through the NMT models and add to our arracy of arrays
    for (var i=0; i<nmtModels.length; i++) {

      // Track the language code to name mappings (handy to know)
      if (2 == nmtModels[i].source.length) { // ignore mapping from long codes
        //console.log("storring mapping from "+nmtModels[i].source+" to "+nmtModels[i].source_name);
        langCodeMap[nmtModels[i].source] = nmtModels[i].source_name;
        langNameMap[nmtModels[i].source_name] = nmtModels[i].source;
      }
      if (2 == nmtModels[i].target.length) { // ignore mapping from long codes
        //console.log("storring mapping from "+nmtModels[i].target+" to "+nmtModels[i].target_name);
        langCodeMap[nmtModels[i].target] = nmtModels[i].target_name;
        langNameMap[nmtModels[i].target_name] = nmtModels[i].target;
      }

      // Add the source language to our sttModels (if we never saw them before)
      var source = nmtModels[i].source.substring(0,2);
      var existing = sttModelMap[source];
      if (existing === undefined) {
        //console.log("Adding "+source+" as a source language "+sttModels.length);
        sttModelMap[source]=sttModels.length;
        sttModels[sttModels.length] = {};
        sttModels[sttModels.length-1].language = source+"-"+source.toUpperCase();
        sttModels[sttModels.length-1].name = source+"-"+source.toUpperCase()+"_NonModel";
        sttModels[sttModels.length-1].description = nmtModels[i].source_name + " (typing)";
      }

      // Add to the transLangs structure
   	  var target =  nmtModels[i].target.substring(0,2); // ignore longer codes
      if (!transLangs[source]) {
      	// the first time we saw this source language create the sub-structure
      	transLangs[source] = {};
      }
      transLangs[source][target] = nmtModels[i].model_id;
    }

    // Sort the STT models so they look nice in the list
    sttModels.sort(function (a, b){
    	var nameA=a.description || "";
    	var nameB=b.description || "";
    	if (nameA < nameB) //sort string ascending
    		return -1;
    	if (nameA > nameB)
    		return 1;
    	return 0; //default return value (no sorting)
    });

    // Save parsed info to localstorage so they are useable elsewhere
    localStorage.setItem('transLangs', JSON.stringify(transLangs));
    // TODO BOD rename global variable models to sttModels
    localStorage.setItem('models', JSON.stringify(sttModels));
    localStorage.setItem('langNameMap', JSON.stringify(langNameMap));
    localStorage.setItem('langCodeMap', JSON.stringify(langCodeMap));

    // Set default current model
    localStorage.setItem('currentModel', 'en-US_BroadbandModel');
    localStorage.setItem('sessionPermissions', 'true');


    var viewContext = {
      currentModel: 'en-US_BroadbandModel',
      models:  sttModels,
      token: token,
      bufferSize: BUFFERSIZE
    };

    initViews(viewContext);

  }

  modelRequest.send();
}

$(document).ready(function() {

  // Make call to API to try and get token
  utils.getToken(function(token) {

    window.onbeforeunload = function(e) {
      localStorage.clear();
    };

    if (!token) {
      console.error('No authorization token available');
      console.error('Attempting to reconnect...');
    }

    getServerModels(token);

    $.subscribe('clearscreen', function() {
      $('#resultsText').text('');
      $('#resultsJSON').text('');
      $('.error-row').hide();
      $('.notification-row').hide();
      $('.hypotheses > ul').empty();
      $('#metadataTableBody').empty();
    });

  });

});

},{"./Microphone":1,"./data/models.json":2,"./utils":7,"./views":13}],6:[function(require,module,exports){
/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*global $:false */


var utils = require('./utils');
var Microphone = require('./Microphone');
var showerror = require('./views/showerror');
var showError = showerror.showError;
var hideError = showerror.hideError;

// Mini WS callback API, so we can initialize
// with model and token in URI, plus
// start message

// Initialize closure, which holds maximum getToken call count
var tokenGenerator = utils.createTokenGenerator();

var initSocket = exports.initSocket = function(options, onopen, onlistening, onmessage, onerror, onclose) {
  var listening;
  function withDefault(val, defaultVal) {
    return typeof val === 'undefined' ? defaultVal : val;
  }
  var socket;
  var token = options.token;
  var model = options.model || localStorage.getItem('currentModel');
  var message = options.message || {'action': 'start'};
  var sessionPermissions = withDefault(options.sessionPermissions, JSON.parse(localStorage.getItem('sessionPermissions')));
  var sessionPermissionsQueryParam = sessionPermissions ? '0' : '1';
  var url = options.serviceURI || 'wss://stream.watsonplatform.net/speech-to-text/api/v1/recognize?watson-token='
    + token
    + '&X-WDC-PL-OPT-OUT=' + sessionPermissionsQueryParam
    + '&model=' + model;
  console.log('URL model', model);
  try {
    socket = new WebSocket(url);
  } catch(err) {
    console.error('WS connection error: ', err);
  }
  socket.onopen = function(evt) {
    listening = false;
    $.subscribe('hardsocketstop', function(data) {
      console.log('MICROPHONE: close.');
      socket.send(JSON.stringify({action:'stop'}));
    });
    $.subscribe('socketstop', function(data) {
      console.log('MICROPHONE: close.');
      socket.close();
    });
    socket.send(JSON.stringify(message));
    onopen(socket);
  };
  socket.onmessage = function(evt) {
    var msg = JSON.parse(evt.data);
    if (msg.error) {
      showError(msg.error);
      $.publish('hardsocketstop');
      return;
    }
    if (msg.state === 'listening') {
      // Early cut off, without notification
      if (!listening) {
        onlistening(socket);
        listening = true;
      } else {
        console.log('MICROPHONE: Closing socket.');
        socket.close();
      }
    }
    onmessage(msg, socket);
  };

  socket.onerror = function(evt) {
    console.log('WS onerror: ', evt);
    showError('Application error ' + evt.code + ': please refresh your browser and try again');
    $.publish('clearscreen');
    onerror(evt);
  };

  socket.onclose = function(evt) {
    console.log('WS onclose: ', evt);
    if (evt.code === 1006) {
      // Authentication error, try to reconnect
      console.log('generator count', tokenGenerator.getCount());
      if (tokenGenerator.getCount() > 1) {
        $.publish('hardsocketstop');
        throw new Error("No authorization token is currently available");
      }
      tokenGenerator.getToken(function(token, err) {
        if (err) {
          $.publish('hardsocketstop');
          return false;
        }
        console.log('Fetching additional token...');
        options.token = token;
        initSocket(options, onopen, onlistening, onmessage, onerror, onclose);
      });
      return false;
    }
    if (evt.code === 1011) {
      console.error('Server error ' + evt.code + ': please refresh your browser and try again');
      return false;
    }
    if (evt.code > 1000) {
      console.error('Server error ' + evt.code + ': please refresh your browser and try again');
      // showError('Server error ' + evt.code + ': please refresh your browser and try again');
      return false;
    }
    // Made it through, normal close
    $.unsubscribe('hardsocketstop');
    $.unsubscribe('socketstop');
    onclose(evt);
  };

}
},{"./Microphone":1,"./utils":7,"./views/showerror":18}],7:[function(require,module,exports){
(function (global){

// For non-view logic
var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);

var fileBlock = function(_offset, length, _file, readChunk) {
  var r = new FileReader();
  var blob = _file.slice(_offset, length + _offset);
  r.onload = readChunk;
  r.readAsArrayBuffer(blob);
}

// Based on alediaferia's SO response
// http://stackoverflow.com/questions/14438187/javascript-filereader-parsing-long-file-in-chunks
exports.onFileProgress = function(options, ondata, onerror, onend) {
  var file       = options.file;
  var fileSize   = file.size;
  var chunkSize  = options.bufferSize || 8192;
  var offset     = 0;
  var readChunk = function(evt) {
    if (offset >= fileSize) {
      console.log("Done reading file");
      onend();
      return;
    }
    if (evt.target.error == null) {
      var buffer = evt.target.result;
      var len = buffer.byteLength;
      offset += len;
      ondata(buffer); // callback for handling read chunk
    } else {
      var errorMessage = evt.target.error;
      console.log("Read error: " + errorMessage);
      onerror(errorMessage);
      return;
    }
    fileBlock(offset, chunkSize, file, readChunk);
  }
  fileBlock(offset, chunkSize, file, readChunk);
}

exports.createTokenGenerator = function() {
  // Make call to API to try and get token
  var hasBeenRunTimes = 0;
  return {
    getToken: function(callback) {
    ++hasBeenRunTimes;
    if (hasBeenRunTimes > 5) {
      var err = new Error('Cannot reach server');
      callback(null, err);
      return;
    }
    var url = '/token';
    var tokenRequest = new XMLHttpRequest();
    tokenRequest.open("GET", url, true);
    tokenRequest.onload = function(evt) {
      var token = tokenRequest.responseText;
      callback(token);
    };
    tokenRequest.send();
    },
    getCount: function() { return hasBeenRunTimes; }
  }
};

exports.getToken = (function() {
  // Make call to API to try and get token
  var hasBeenRunTimes = 0;
  return function(callback) {
    hasBeenRunTimes++
    if (hasBeenRunTimes > 5) {
      var err = new Error('Cannot reach server');
      callback(null, err);
      return;
    }
    var url = '/token';
    var tokenRequest = new XMLHttpRequest();
    tokenRequest.open("GET", url, true);
    tokenRequest.onload = function(evt) {
      var token = tokenRequest.responseText;
      callback(token);
    };
    tokenRequest.send();
  }
})();

exports.initPubSub = function() {
  var o         = $({});
  $.subscribe   = o.on.bind(o);
  $.unsubscribe = o.off.bind(o);
  $.publish     = o.trigger.bind(o);
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){


exports.initAnimatePanel = function() {
  $('.panel-heading span.clickable').on("click", function (e) {
    if ($(this).hasClass('panel-collapsed')) {
      // expand the panel
      $(this).parents('.panel').find('.panel-body').slideDown();
      $(this).removeClass('panel-collapsed');
      $(this).find('i').removeClass('caret-down').addClass('caret-up');
    }
    else {
      // collapse the panel
      $(this).parents('.panel').find('.panel-body').slideUp();
      $(this).addClass('panel-collapsed');
      $(this).find('i').removeClass('caret-up').addClass('caret-down');
    }
  });
}


},{}],9:[function(require,module,exports){
(function (global){
'use strict';

var $ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null);
var scrolled = false,
    textScrolled = false;

var showTimestamp = function(timestamps, confidences) {
  var word = timestamps[0],
      t0 = timestamps[1],
      t1 = timestamps[2];
  var timelength = t1 - t0;
  // Show confidence if defined, else 'n/a'
  var displayConfidence = confidences ? confidences[1].toString().substring(0, 3) : 'n/a';
  $('#metadataTable > tbody:last-child').append(
      '<tr>'
      + '<td>' + word + '</td>'
      + '<td>' + t0 + '</td>'
      + '<td>' + t1 + '</td>'
      + '<td>' + displayConfidence + '</td>'
      + '</tr>'
      );
}


var showMetaData = function(alternative) {
  var confidenceNestedArray = alternative.word_confidence;;
  var timestampNestedArray = alternative.timestamps;
  if (confidenceNestedArray && confidenceNestedArray.length > 0) {
    for (var i = 0; i < confidenceNestedArray.length; i++) {
      var timestamps = timestampNestedArray[i];
      var confidences = confidenceNestedArray[i];
      showTimestamp(timestamps, confidences);
    }
    return;
  } else {
    if (timestampNestedArray && timestampNestedArray.length > 0) {
      timestampNestedArray.forEach(function(timestamp) {
        showTimestamp(timestamp);
      });
    }
  }
}

var Alternatives = function(){

  var stringOne = '',
    stringTwo = '',
    stringThree = '';

  this.clearString = function() {
    stringOne = '';
    stringTwo = '';
    stringThree = '';
  };

  this.showAlternatives = function(alternatives, isFinal, testing) {
    var $hypotheses = $('.hypotheses ol');
    $hypotheses.empty();
    // $hypotheses.append($('</br>'));
    alternatives.forEach(function(alternative, idx) {
      var $alternative;
      if (alternative.transcript) {
        var transcript = alternative.transcript.replace(/%HESITATION\s/g, '');
        transcript = transcript.replace(/(.)\1{2,}/g, '');
        switch (idx) {
          case 0:
            stringOne = stringOne + transcript;
            $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringOne + '</li>');
            break;
          case 1:
            stringTwo = stringTwo + transcript;
            $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringTwo + '</li>');
            break;
          case 2:
            stringThree = stringThree + transcript;
            $alternative = $('<li data-hypothesis-index=' + idx + ' >' + stringThree + '</li>');
            break;
        }
        $hypotheses.append($alternative);
      }
    });
  };
}

var alternativePrototype = new Alternatives();

// TODO: Convert to closure approach
var processString = function(currString, isFinished) {

  if (isFinished) {
    var formattedString = currString.slice(0, -1);
    formattedString = formattedString.charAt(0).toUpperCase() + formattedString.substring(1);
    formattedString = formattedString.trim() + '.';
    $('#resultsText').val(formattedString);
  } else {
    $('#resultsText').val(currString);
  }

}

function updateTextScroll(){
  if(!scrolled){
    var element = $('#resultsText').get(0);
    element.scrollTop = element.scrollHeight;
  }
}

var initTextScroll = function() {
  $('#resultsText').on('scroll', function(){
      textScrolled = true;
  });
}

// L.R.
// --------------------------------- MT & TTS ----------------------------------------
function getVoice() {
	var mt_target = getTargetLanguageCode();
  //console.log("getting a voice for lang code "+mt_target);
	var voice = '';
	if(mt_target == 'en')
		voice = 'en-US_MichaelVoice'; // TODO: try 'en-US_AllisonVoice' or 'en-US_LisaVoice'
  else if(mt_target == 'de')
		voice = 'de-DE_DieterVoice'; // could be de-DE_BirgitVoice';
  else if(mt_target == 'fr')
		voice = 'fr-FR_ReneeVoice';
	else if(mt_target == 'es')
		voice = 'es-US_SofiaVoice';   // TODO: try 'es-ES_EnriqueVoice' or 'es-ES_LauraVoice'
	else if(mt_target == 'pt')
	voice = 'pt-BR_IsabelaVoice';
  else if(mt_target == 'ja')
		voice = 'ja-JP_EmiVoice';
  else if(mt_target == 'it')
		voice = 'it-IT_FrancescaVoice';
  else
    voice = 'en-GB_KateVoice'; // default whenno model found
	return voice;
}

function TTS(textToSynthesize) {
	console.log('text to synthesize: ---> ' + textToSynthesize);
	var voice = getVoice();
	if(voice == 'en-GB_KateVoice') {
		textToSynthesize = 'We are currently unable to synthesize '+$('#dropdownMenuTargetLanguageDefault').text();
    console.log("Changed text to: "+textToSynthesize);
  }
	synthesizeRequest(textToSynthesize, voice);
}

function getTargetLanguageCode() {
	var langName = $('#dropdownMenuTargetLanguageDefault').text();
    var langNameMap = JSON.parse(localStorage.getItem('langNameMap'));
    var langCode = langNameMap[langName];
    console.log("Target language is "+langName+" has code "+langCode);
	return langCode;
}

function translate(textContent) {
  // 1. get current speech-to-text model, extract its two first letters, and lower case them.
	var currentModel = localStorage.getItem('currentModel') || 'en-US_BroadbandModel';
	var mt_source = currentModel.substring(0, 2).toLowerCase();

	// 2. get target language code to translate to
	var lang = $('#dropdownMenuTargetLanguageDefault').text();
	var mt_target = getTargetLanguageCode();

  var transLangs = JSON.parse(localStorage.getItem('transLangs'));
	// call language translation service if mt_source != mt_target, otherwise jump to TTS
	if(mt_source != mt_target) {
    var model_id = transLangs[mt_source][mt_target];
    console.log("Model "+model_id+" selected to translate from "+mt_source+" to "+mt_target);

		var callData = {
			model_id: model_id,
			text: textContent
		};

		var restAPICall = {
			type: 'POST',
			url: "/api/translate",
			data: callData,
			headers: {
				'X-WDC-PL-OPT-OUT': '0'
			},
			async: true,
      timeout: 3000 // sets timeout to 3 seconds
		};

    console.log ('calling translate API: '+JSON.stringify(restAPICall));
		$.ajax(restAPICall)
			.done(function(data) {
        console.log ('data: '+JSON.stringify(data));
        var translation = data['error_message'];
        if (translation) {
          translation = "ERROR: "+translation;
        } else {
          translation = data['translations'][0]['translation'];
        }
				$('#translation textarea').val(function(_, val){
				    var delimiter = val.length > 0 ? ". " : "";
					return val + delimiter + translation;
				});
				TTS(translation);
			})
			.fail(function(jqXHR, statustext, errorthrown) {
				console.log('statustext: '+statustext + ' errorthrown: '+errorthrown);
			});
	}
	else {
    console.log('no need to translate since source and text match');
		$('#translation textarea').val(textContent);
		TTS(textContent);
	}
}

var ttsAudio = $('.audio-tts').get(0);

// interpret typing enter in resultsText as an intention to submit
$('#resultsText').keydown(function(event) {
  // enter has keyCode = 13, change it if you want to use another button
  if (event.keyCode == 13) {
    $('#translate').click();
    return false;
  }
});

$('#translate').click(function() {
  var textContent = $('#resultsText').val();
  $('#translation textarea').val('');
  translate(textContent);
});

$('#playTTS').click(function() {
  var textContent = $('#resultsText').val();
  $('#translation textarea').val('');
  translate(textContent);
});

$('#stopTTS').click(function() {
	ttsAudio.pause();
});

window.ttsChunks = new Array();
window.ttsChunksIndex = 0;
window.inputSpeechOn = false;

var timerStarted = false;
var timerID;

var playTTSChunk = function() {
	if(ttsChunksIndex >= ttsChunks.length)
		return;

	var downloadURL = ttsChunks[ttsChunksIndex];
	ttsChunksIndex = ttsChunksIndex + 1;

	ttsAudio.src = downloadURL;
	ttsAudio.load();
	ttsAudio.play();
}

ttsAudio.addEventListener('ended', playTTSChunk);

function playTTSifInputSpeechIsOff() {
	clearTimeout(timerID);
	var streaming = $('#microphone_streaming').prop('checked');

	if(streaming== false && inputSpeechOn == true || ttsAudio.paused == false) {
		timerID = setTimeout(playTTSifInputSpeechIsOff, 100);
		timerStarted = true;
	}
	else {
		timerStarted = false;
		playTTSChunk();
	}
}

function synthesizeRequest(text, v) {
	var downloadURL = '/synthesize' +
	  '?voice=' + v +
	  '&text=' + encodeURIComponent(text) +
	  '&X-WDC-PL-OPT-OUT=0';

	ttsChunks.push(downloadURL);

	if(timerStarted == false) {
		timerID = setTimeout(playTTSifInputSpeechIsOff, 300);
		timerStarted = true;
	}
}

// ------------------------------------------------------------------------------------

var initScroll = function() {
  $('.table-scroll').on('scroll', function(){
      scrolled=true;
  });
}

exports.initDisplayMetadata = function() {
  initScroll();
  initTextScroll();
};

exports.showResult = function(msg) {

  var idx = +msg.result_index;

  if (msg.results && msg.results.length > 0) {

    var alternatives = msg.results[0].alternatives;
    var text = msg.results[0].alternatives[0].transcript || '';
    console.log("baseString="+baseString+" newText="+text + (msg.results[0].final ? " (final)" : " (tentative)"));
    var transTime = 0, delay = 0;
    var ts = msg.results[0].alternatives[0].timestamps;
    if (ts)
      transTime = ts[ts.length-1][2];
    // var au =$('.audio-tts').get(0);
    // var audioTime =  $('.audio-tts').get(0).currentTime;
    var audioTime = 0;
    if (audioIn) audioTime = audioIn.currentTime;
    if (transTime>audioTime)
      delay = Math.ceil(1000*(transTime-audioTime));
    console.log ("v2 audioTime="+audioTime+" transTime="+transTime+" delay="+delay+"msec");


	// L.R.
	// console.log('transcription: ---> ' + text);

	setTimeout(function(){
		// if final results, append a new paragraph
		if (msg.results && msg.results[0] && msg.results[0].final) {
		  baseString += text;
		  var displayFinalString = baseString;
		  displayFinalString = displayFinalString.replace(/%HESITATION\s/g, '');
		  displayFinalString = displayFinalString.replace(/(.)\1{2,}/g, '');
		  processString(displayFinalString, true);

		  // HACK to ignore nn, nnn, nnnn sequences !!!
		  var res = text.match("([n]{2,} )");
		  if(res == null) {
        console.log('---> translating text=' + text);
			  translate(text);
		  }
		  else {
			  console.log('---> translation is skipped for text=' + text);
		  }
		}
		else {
      console.log ("Temporarily Displaying \""+baseString+"\" + \""+text+"\"");
      var tempString = baseString + text;
		  tempString = tempString.replace(/%HESITATION\s/g, '');
		  tempString = tempString.replace(/(.)\1{2,}/g, '');
		  processString(tempString, false);
		}

	  updateTextScroll();
    console.log('after showResult() baseString='+baseString);
    }, delay);
  }
};

$.subscribe('clearscreen', function() {
  var $hypotheses = $('.hypotheses ul');
  scrolled = false;
  $hypotheses.empty();
  alternativePrototype.clearString();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){

'use strict';

var handleSelectedFile = require('./fileupload').handleSelectedFile;

exports.initDragDrop = function(ctx) {

  var dragAndDropTarget = $(document);

  dragAndDropTarget.on('dragenter', function (e) {
    e.stopPropagation();
    e.preventDefault();
  });

  dragAndDropTarget.on('dragover', function (e) {
    e.stopPropagation();
    e.preventDefault();
  });

  dragAndDropTarget.on('drop', function (e) {
    console.log('File dropped');
    e.preventDefault();
    var evt = e.originalEvent;
    // Handle dragged file event
    handleFileUploadEvent(evt);
  });

  function handleFileUploadEvent(evt) {
    // Init file upload with default model
    var file = evt.dataTransfer.files[0];
    handleSelectedFile(ctx.token, file);
  }

}

},{"./fileupload":12}],11:[function(require,module,exports){



exports.flashSVG = function(el) {
  el.css({ fill: '#A53725' });
  function loop() {
    el.animate({ fill: '#A53725' },
        1000, 'linear')
      .animate({ fill: 'white' },
          1000, 'linear');
  }
  // return timer
  var timer = setTimeout(loop, 2000);
  return timer;
};

exports.stopFlashSVG = function(timer) {
  el.css({ fill: 'white' } );
  clearInterval(timer);
}

exports.toggleImage = function(el, name) {
  if(el.attr('src') === 'images/' + name + '.svg') {
    el.attr("src", 'images/stop-red.svg');
  } else {
    el.attr('src', 'images/stop.svg');
  }
}

var restoreImage = exports.restoreImage = function(el, name) {
  el.attr('src', 'images/' + name + '.svg');
}

exports.stopToggleImage = function(timer, el, name) {
  clearInterval(timer);
  restoreImage(el, name);
}

},{}],12:[function(require,module,exports){

'use strict';

var showError = require('./showerror').showError;
var showNotice = require('./showerror').showNotice;
var handleFileUpload = require('../handlefileupload').handleFileUpload;
var effects = require('./effects');
var utils = require('../utils');

// Need to remove the view logic here and move this out to the handlefileupload controller
var handleSelectedFile = exports.handleSelectedFile = (function() {

    var running = false;
	localStorage.setItem('currentlyDisplaying', false);

    return function(token, file) {

    var currentlyDisplaying = JSON.parse(localStorage.getItem('currentlyDisplaying'));

    // if (currentlyDisplaying) {
    //   showError('Currently another file is playing, please stop the file or wait until it finishes');
    //   return;
    // }

    $.publish('clearscreen');
	$('#translation textarea').val('');     	 // L.R.
	ttsChunks.length = 0;						 // L.R.
	var ttsAudio = $('.audio-tts').get(0);		 // L.R.
	ttsAudio.pause();							 // L.R.
	inputSpeechOn = true;						 // L.R.
	ttsChunksIndex = 0;							 // L.R.

    localStorage.setItem('currentlyDisplaying', true);
    running = true;

    // Visual effects
    var uploadImageTag = $('#fileUploadTarget > img');
    var timer = setInterval(effects.toggleImage, 750, uploadImageTag, 'stop');
    var uploadText = $('#fileUploadTarget > span');
    uploadText.text('Stop Transcribing');

    function restoreUploadTab() {
      clearInterval(timer);
      effects.restoreImage(uploadImageTag, 'upload');
      uploadText.text('Select File');
    }

    // Clear flashing if socket upload is stopped
    $.subscribe('hardsocketstop', function(data) {
      restoreUploadTab();
    });


    // Get current model
    var currentModel = localStorage.getItem('currentModel');
    console.log('currentModel', currentModel);

    // Read first 4 bytes to determine header
    var blobToText = new Blob([file]).slice(0, 4);
    var r = new FileReader();
    r.readAsText(blobToText);
    r.onload = function() {
      var contentType;
      if (r.result === 'fLaC') {
        contentType = 'audio/flac';
        showNotice('Notice: browsers do not support playing FLAC audio, so no audio will accompany the transcription');
      } else if (r.result === 'RIFF') {
        contentType = 'audio/wav';
        audioIn = new Audio();
        var wavBlob = new Blob([file], {type: 'audio/wav'});
        var wavURL = URL.createObjectURL(wavBlob);
        audioIn.src = wavURL;
        audioIn.play();
        $.subscribe('hardsocketstop', function() {
          audioIn.pause();
          audioIn.currentTime = 0;
        });
      } else {
        restoreUploadTab();
        showError('Only WAV or FLAC files can be transcribed, please try another file format');
        return;
      }
      handleFileUpload(token, currentModel, file, contentType, function(socket) {
        var blob = new Blob([file]);
        var parseOptions = {
          file: blob
        };
        utils.onFileProgress(parseOptions,
          // On data chunk
          function(chunk) {
            socket.send(chunk);
          },
          // On file read error
          function(evt) {
            console.log('Error reading file: ', evt.message);
            showError('Error: ' + evt.message);
			inputSpeechOn = false;					 // L.R.
          },
          // On load end
          function() {
            socket.send(JSON.stringify({'action': 'stop'}));
			inputSpeechOn = false;					 // L.R.
          });
      },
        function(evt) {
          effects.stopToggleImage(timer, uploadImageTag, 'upload');
          uploadText.text('Select File');
          localStorage.setItem('currentlyDisplaying', false);
        }
      );
    };
  }
})();


exports.initFileUpload = function(ctx) {

  var fileUploadDialog = $("#fileUploadDialog");

  fileUploadDialog.change(function(evt) {
    var file = fileUploadDialog.get(0).files[0];
    handleSelectedFile(ctx.token, file);
  });

  $("#fileUploadTarget").click(function(evt) {

    var currentlyDisplaying = JSON.parse(localStorage.getItem('currentlyDisplaying'));

    if (currentlyDisplaying) {
      console.log('HARD SOCKET STOP');
      $.publish('hardsocketstop');
      localStorage.setItem('currentlyDisplaying', false);
      return;
    }

    fileUploadDialog.val(null);

    fileUploadDialog
    .trigger('click');

  });

}
},{"../handlefileupload":3,"../utils":7,"./effects":11,"./showerror":18}],13:[function(require,module,exports){

var initSessionPermissions = require('./sessionpermissions').initSessionPermissions;
var initSelectModel = require('./selectmodel').initSelectModel;
var initAnimatePanel = require('./animatepanel').initAnimatePanel;
var initShowTab = require('./showtab').initShowTab;
var initDragDrop = require('./dragdrop').initDragDrop;
var initPlaySample = require('./playsample').initPlaySample;
var initRecordButton = require('./recordbutton').initRecordButton;
var initFileUpload = require('./fileupload').initFileUpload;
var initDisplayMetadata = require('./displaymetadata').initDisplayMetadata;


exports.initViews = function(ctx) {
  console.log('Initializing views...');
  initSelectModel(ctx);
  initPlaySample(ctx);
  initDragDrop(ctx);
  initRecordButton(ctx);
  initFileUpload(ctx);
  initSessionPermissions();
  initShowTab();
  initAnimatePanel();
  initShowTab();
  initDisplayMetadata();
}

},{"./animatepanel":8,"./displaymetadata":9,"./dragdrop":10,"./fileupload":12,"./playsample":14,"./recordbutton":15,"./selectmodel":16,"./sessionpermissions":17,"./showtab":19}],14:[function(require,module,exports){

'use strict';

var utils = require('../utils');
var onFileProgress = utils.onFileProgress;
var handleFileUpload = require('../handlefileupload').handleFileUpload;
var initSocket = require('../socket').initSocket;
var showError = require('./showerror').showError;
var effects = require('./effects');


var LOOKUP_TABLE = {
  'ar-AR_BroadbandModel': ['ar-AR_Broadband_sample1.wav', 'ar-AR_Broadband_sample2.wav'],
  'en-US_BroadbandModel': ['AmericaFirst.wav', 'Us_English_Broadband_Sample_2.wav', 'Us_English_Broadband_Sample_1.wav', 'homer-balogna.wav'],
  'en-US_NarrowbandModel': ['Us_English_Narrowband_Sample_1.wav', 'Us_English_Narrowband_Sample_2.wav'],
  'es-ES_BroadbandModel': ['Es_ES_spk24_16khz.wav', 'Es_ES_spk19_16khz.wav'],
  'es-ES_NarrowbandModel': ['Es_ES_spk24_8khz.wav', 'Es_ES_spk19_8khz.wav'],
  'ja-JP_BroadbandModel': ['sample-Ja_JP-wide1.wav', 'sample-Ja_JP-wide2.wav'],
  'ja-JP_NarrowbandModel': ['sample-Ja_JP-narrow3.wav', 'sample-Ja_JP-narrow4.wav'],
  'pt-BR_BroadbandModel': ['pt-BR_Sample1-16KHz.wav', 'pt-BR_Sample2-16KHz.wav'],
  'fr-FR_BroadbandModel': ['fr-macron.wav', 'fr-burke.wav', 'fr-grimm.wav'],
  'zh-CN_BroadbandModel': ['zh-gospel.wav', 'zh-poem.wav']
};

var playSample = (function() {

  var running = false;
  localStorage.setItem('currentlyDisplaying', false);

  return function(token, imageTag, iconName, url, callback) {
	$('#translation textarea').val('');     	 // L.R.
	ttsChunks.length = 0;						 // L.R.
	var ttsAudio = $('.audio-tts').get(0);		 // L.R.
	ttsAudio.pause();							 // L.R.
	inputSpeechOn = true;						 // L.R.
	ttsChunksIndex = 0;							 // L.R.

    $.publish('clearscreen');

    var currentlyDisplaying = JSON.parse(localStorage.getItem('currentlyDisplaying'));

    console.log('CURRENTLY DISPLAYING', currentlyDisplaying);

    // This error handling needs to be expanded to accomodate
    // the two different play samples files
    if (currentlyDisplaying) {
      console.log('HARD SOCKET STOP');
      $.publish('socketstop');
      localStorage.setItem('currentlyDisplaying', false);
      effects.stopToggleImage(timer, imageTag, iconName);
      effects.restoreImage(imageTag, iconName);
      running = false;
      return;
    }

    if (currentlyDisplaying && running) {
      showError('Currently another file is playing, please stop the file or wait until it finishes');
      return;
    }

    localStorage.setItem('currentlyDisplaying', true);
    running = true;

    var timer = setInterval(effects.toggleImage, 750, imageTag, iconName);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      var blob = xhr.response;
      var currentModel = localStorage.getItem('currentModel') || 'en-US_BroadbandModel';
      var reader = new FileReader();
      var blobToText = new Blob([blob]).slice(0, 4);
      reader.readAsText(blobToText);
      reader.onload = function() {
        var contentType = reader.result === 'fLaC' ? 'audio/flac' : 'audio/wav';
        console.log('Uploading file', reader.result);
        var mediaSourceURL = URL.createObjectURL(blob);
        var audio = new Audio();
        audio.src = mediaSourceURL;
        audio.play();
        $.subscribe('hardsocketstop', function() {
          audio.pause();
          audio.currentTime = 0;
        });
        $.subscribe('socketstop', function() {
          audio.pause();
          audio.currentTime = 0;
        });
        handleFileUpload(token, currentModel, blob, contentType, function(socket) {
          var parseOptions = {
            file: blob
          };
          onFileProgress(parseOptions,
            // On data chunk
            function(chunk) {
              socket.send(chunk);
            },
            // On file read error
            function(evt) {
              console.log('Error reading file: ', evt.message);
              // showError(evt.message);
            },
            // On load end
            function() {
              socket.send(JSON.stringify({'action': 'stop'}));
            });
        },
        // On connection end
          function(evt) {
            effects.stopToggleImage(timer, imageTag, iconName);
            effects.restoreImage(imageTag, iconName);
            localStorage.getItem('currentlyDisplaying', false);
			inputSpeechOn = false; // L.R.
          }
        );
      };
    };
    xhr.send();
  };
})();


exports.initPlaySample = function(ctx) {

  (function() {
    if ((null === ctx.currentModel) || ctx.currentModel.includes('NonModel')) {
      console.log ("model name "+ctx.currentMode+" so this is not a real model");
      document.getElementById("audioControls").style.display="none";
      return;
    } else {
      document.getElementById("audioControls").style.display="block";
    }
    var fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][0];
    var el = $('.play-sample-1');
    el.off('click');
    var iconName = 'play';
    var imageTag = el.find('img');
    el.click( function(evt) {
      playSample(ctx.token, imageTag, iconName, fileName, function(result) {
        console.log('Play sample result', result);
      });
    });
  })(ctx, LOOKUP_TABLE);

  (function() {
    if ((null === ctx.currentModel) || ctx.currentModel.includes('NonModel')) {
      return;
    }
    var fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][1];
    var el = $('.play-sample-2');
    el.off('click');
    var iconName = 'play';
    var imageTag = el.find('img');
    el.click( function(evt) {
      playSample(ctx.token, imageTag, iconName, fileName, function(result) {
        console.log('Play sample result', result);
      });
    });
  })(ctx, LOOKUP_TABLE);

  (function() {
    var fileName;
    if ((null === ctx.currentModel) || ctx.currentModel.includes('NonModel')) {
      return;
    } else {
      fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][2];
      if (!fileName) {
        fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][0];
      } else {
        fileName = 'audio/' + fileName;
      }
    }
    var el = $('.play-sample-3');
    el.off('click');
    var iconName = 'play';
    var imageTag = el.find('img');
    el.click( function(evt) {
      playSample(ctx.token, imageTag, iconName, fileName, function(result) {
        console.log('Play sample result', result);
      });
    });
  })(ctx, LOOKUP_TABLE);

  (function() {
    var fileName;
    if ((null === ctx.currentModel) || ctx.currentModel.includes('NonModel')) {
      return;
    } else {
      fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][3];
      if (!fileName) {
        fileName = 'audio/' + LOOKUP_TABLE[ctx.currentModel][1];
      } else {
        fileName = 'audio/' + fileName;
      }
    }
    var el = $('.play-sample-4');
    el.off('click');
    var iconName = 'play';
    var imageTag = el.find('img');
    el.click( function(evt) {
      playSample(ctx.token, imageTag, iconName, fileName, function(result) {
        console.log('Play sample result', result);
      });
    });
  })(ctx, LOOKUP_TABLE);

};
},{"../handlefileupload":3,"../socket":6,"../utils":7,"./effects":11,"./showerror":18}],15:[function(require,module,exports){

'use strict';

var Microphone = require('../Microphone');
var handleMicrophone = require('../handlemicrophone').handleMicrophone;
var showError = require('./showerror').showError;
var showNotice = require('./showerror').showNotice;

exports.initRecordButton = function(ctx) {

  var recordButton = $('#recordButton');

  recordButton.click((function() {
    var running = false;
    var token = ctx.token;
    var micOptions = {
      bufferSize: ctx.buffersize
    };
    var mic = new Microphone(micOptions);

    return function(evt) {
      // Prevent default anchor behavior
      evt.preventDefault();

      var currentModel = localStorage.getItem('currentModel');
      var currentlyDisplaying = JSON.parse(localStorage.getItem('currentlyDisplaying'));

      if (currentlyDisplaying) {
        showError('Currently another file is playing, please stop the file or wait until it finishes');
        return;
      }

      if (!running) {
        console.log('Not running, handleMicrophone()');
        handleMicrophone(token, currentModel, mic, function(err, socket) {
          if (err) {
            var msg = 'Error: ' + err.message;
            console.log(msg);
            showError(msg);
            running = false;
			inputSpeechOn = false;						 // L.R.
          } else {
            recordButton.css('background-color', '#d74108');
            recordButton.find('img').attr('src', 'images/stop.svg');
            console.log('starting mic');
            mic.record();
            running = true;
			$('#translation textarea').val('');     	 // L.R.
			ttsChunks.length = 0;						 // L.R.
			var ttsAudio = $('.audio-tts').get(0);		 // L.R.
			ttsAudio.pause();							 // L.R.
			inputSpeechOn = true;						 // L.R.
			ttsChunksIndex = 0;							 // L.R.
          }
        });
      }
	  else {
        console.log('Stopping microphone, sending stop action message');
        recordButton.removeAttr('style');
        recordButton.find('img').attr('src', 'images/microphone.svg');
        $.publish('hardsocketstop');
        mic.stop();
        running = false;
		inputSpeechOn = false;						 	 // L.R.
      }
    }
  })());
}
},{"../Microphone":1,"../handlemicrophone":4,"./showerror":18}],16:[function(require,module,exports){

var initPlaySample = require('./playsample').initPlaySample;

exports.initSelectModel = function(ctx) {

  function isDefault(model) {
    return model === 'en-US_BroadbandModel';
  }

  ctx.models.forEach(function(model) {
    $("#dropdownMenuList").append(
      $("<li>")
        .attr('role', 'presentation')
        .append(
          $('<a>').attr('role', 'menu-item')
            .attr('href', '/')
            .attr('data-model', model.name)
            .append(model.description)
          )
      )
  });

  function onChooseTargetLanguageClick() {
  	// TODO BOD change to use models returned by the server
  	var currentModel = localStorage.getItem('currentModel') || 'en-US_BroadbandModel';
  	var currSource = currentModel.substring(0,2);

  	// clear the current drop down list contents
  	var list = $("#dropdownMenuTargetLanguage");
  	list.empty();

    var langCodeMap = JSON.parse(localStorage.getItem('langCodeMap'));
    var langNameMap = JSON.parse(localStorage.getItem('langNameMap'));

    var transLangs = JSON.parse(localStorage.getItem('transLangs'));
    var targetLangCodes = transLangs[currSource];
    console.log("Building a list of possible target languages when source="+currSource);
    var listItems = new Array();
    for (var key in targetLangCodes) {
      var possibleTargets = targetLangCodes[key];
      var targetName = langCodeMap[key];
      console.log("If we choise target "+targetName+" the matching model is "+JSON.stringify(possibleTargets));
      //list.append("<li role='presentation'><a role='menuitem' tabindex='0'>"+targetName+"</a></li>");
      listItems.push("<li role='presentation'><a role='menuitem' tabindex='0'>"+targetName+"</a></li>");
    }
    listItems.sort();
    for (var i in listItems) {
      list.append(listItems[i])
    }
  }

  $("#dropdownMenuList").click(function(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    console.log('Change view', $(evt.target).text());
    var newModelDescription = $(evt.target).text();
    var newModel = $(evt.target).data('model');
    $('#dropdownMenuDefault').empty().text(newModelDescription);
    //$('#dropdownMenuTargetLanguageDefault').text("Choose Target Language");
    $('#dropdownMenuTargetLanguageDefault').text("English");
    if (newModelDescription.includes('English'))
      $("#dropdownMenuTargetLanguage").empty();
    else
      $("#dropdownMenuTargetLanguage").text('English')
    $('#dropdownMenu1').dropdown('toggle');
    localStorage.setItem('currentModel', newModel);

    ctx.currentModel = newModel;
    initPlaySample(ctx);
    $.publish('clearscreen');
  });

  $("#dropdownMenuInput").click(function(evt) {
	onChooseTargetLanguageClick();
  });

  $("#dropdownMenuTargetLanguageDefault").click(function(evt) {
	onChooseTargetLanguageClick();
  });

  // Not really needed since you pick a language from a drop-down
  //function isSelectedlanguageValid(lang) {
	// if(lang == "English" || lang == "French" || lang == 'German' || lang == "Spanish" || lang == "Portuguese")
	// 	return true;
	// return false;
  // }

  $("#dropdownMenuTargetLanguage").click(function(evt) {
    var lang = $(evt.target).text();
    //if(isSelectedlanguageValid(lang) == false) return;
    $('#dropdownMenuTargetLanguageDefault').text(lang);
    console.log('Changed target language to ', lang);
  });

}
},{"./playsample":14}],17:[function(require,module,exports){

'use strict';

exports.initSessionPermissions = function() {
  console.log('Initializing session permissions handler');
  // Radio buttons
  var sessionPermissionsRadio = $("#sessionPermissionsRadioGroup input[type='radio']");
  sessionPermissionsRadio.click(function(evt) {
    var checkedValue = sessionPermissionsRadio.filter(':checked').val();
    console.log('checkedValue', checkedValue);
    localStorage.setItem('sessionPermissions', checkedValue);
  });
}

},{}],18:[function(require,module,exports){

'use strict';

exports.showError = function(msg) {
  console.log('Error: ', msg);
  var errorAlert = $('.error-row');
  errorAlert.hide();
  errorAlert.css('background-color', '#d74108');
  errorAlert.css('color', 'white');
  var errorMessage = $('#errorMessage');
  errorMessage.text(msg);
  errorAlert.show();
  $('#errorClose').click(function(e) {
    e.preventDefault();
    errorAlert.hide();
    return false;
  });
}

exports.showNotice = function(msg) {
  console.log('Notice: ', msg);
  var noticeAlert = $('.notification-row');
  noticeAlert.hide();
  noticeAlert.css('border', '2px solid #ececec');
  noticeAlert.css('background-color', '#f4f4f4');
  noticeAlert.css('color', 'black');
  var noticeMessage = $('#notificationMessage');
  noticeMessage.text(msg);
  noticeAlert.show();
  $('#notificationClose').click(function(e) {
    e.preventDefault();
    noticeAlert.hide();
    return false;
  });
}

exports.hideError = function() {
  var errorAlert = $('.error-row');
  errorAlert.hide();
}
},{}],19:[function(require,module,exports){

'use strict';

exports.initShowTab = function() {}

},{}]},{},[5]);
