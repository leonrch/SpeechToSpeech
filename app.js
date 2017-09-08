/**
 * Copyright 2014, 2015 IBM Corp. All Rights Reserved.
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

'use strict';

var express = require('express'),
    app = express(),
	  bodyParser = require("body-parser"), //L.R.
    errorhandler = require('errorhandler'),
    bluemix = require('./config/bluemix'),
    watson = require('watson-developer-cloud'),
    Conversation = require('watson-developer-cloud/conversation/v1'),
    path = require('path'),
    fs = require('fs'),
    extend = require('util')._extend;


// Serve static contend from  public directory
app.use(express.static(path.join(__dirname , './public')));
app.use(bodyParser.json());

// Add error handling in dev
if (!process.env.VCAP_SERVICES) {
  app.use(errorhandler());
}

// When running on Bluemix we will get config data from VCAP_SERVICES
// and a user variable named VCAP_SERVICES
// When running locally we will read config from 'vcap-local.json'
var vcapServices = process.env.VCAP_SERVICES;
if (!vcapServices) vcapServices = {};
var workspace_id = process.env.CONV_WORKSPACE_ID;
if (fs.existsSync("vcap-local.json")) {
  //When running locally, the VCAP_SERVICES will not be set so read from vcap-local.json
  // console.log ("Original env data "+JSON.stringify(vcapServices));
  var jsonData = fs.readFileSync("vcap-local.json", "utf-8");
  // console.log ("vcap-local.json contents\n"+jsonData);
  var localJSON = JSON.parse(jsonData);
  // console.log ("Parsed local data\n"+JSON.stringify(localJSON));
  vcapServices = extend(vcapServices,localJSON.VCAP_SERVICES);
  workspace_id = localJSON.CONV_WORKSPACE_ID
}

// Test here to check a workspace_id was specified
if (!workspace_id)
  throw new Error("No workspace id specified");
else console.log ("Using workspace_id="+workspace_id);
console.log ("Final service data "+JSON.stringify(vcapServices));


// -------------------------------- speech_to_text ---------------------------------
var stt_credentials = {
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: vcapServices.speech_to_text[0].credentials.username,
  password: vcapServices.speech_to_text[0].credentials.password
};
var authorization = watson.authorization(stt_credentials);

// Get token from Watson using your credentials
app.get('/token', function(req, res) {
  console.log ("Getting a token with credentials "+JSON.stringify(stt_credentials));
  authorization.getToken({url: stt_credentials.url}, function(err, token) {
    if (err) {
      console.log('getToken error:', err);
      res.status(err.code);
    }
    res.send(token);
  });
});


// -------------------------------- Conversation ---------------------------------

// Create the service wrapper - use credentials from environment file is running locally or from VCAP_SERVICES on Bluemix
var conv_credentials = extend({
  "url": "https://gateway.watsonplatform.net/conversation/api",
  version: 'v1',
  username: vcapServices.conversation[0].credentials.username,
  password: vcapServices.conversation[0].credentials.password,
  version_date: Conversation.VERSION_DATE_2017_04_21
}, bluemix.getServiceCreds('conversation'));
var conversation = new Conversation(conv_credentials);

// Endpoint to the conversation service that will be called from the client side
app.post('/message', function(req, res) {
  // console.log ('Message sent to conversation service: '+JSON.stringify(req));
  //console.log ('Message sent to conversation service: '+req.body);
  if (!workspace_id) {
    console.log ("we can't respond because no workspace_id has been set");
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the '
        + '<a href="https://github.com/bodonova/SpeakToWatson">README</a> documentation on how to set this variable. <br>'
        + 'Once a workspace has been defined the intents may be imported from '
        + '<a href="https://github.com/bodonova/SpeakToWatson/blob/master/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var payload = {
    workspace_id: workspace_id,
    context: req.body.context || {},
    input: req.body.input || {"text": ""}
  };
  console.log ('payload: '+JSON.stringify(payload));

  // Send the input to the conversation service
  conversation.message(payload, function(err, data) {
    console.log ('Conversation service response: '+JSON.stringify(data));
    if (err) {
      return res.status(err.code || 500).json(err); // the converstion service returned an error
    }
    return res.json(data);
  });
});


// -------------------------------- TTS ---------------------------------
var tts_credentials = extend({
  url: 'https://stream.watsonplatform.net/text-to-speech/api',
  version: 'v1',
  username: vcapServices.text_to_speech[0].credentials.username,
  password: vcapServices.text_to_speech[0].credentials.password
}, bluemix.getServiceCreds('text_to_speech'));

// Create the service wrappers
var textToSpeech = watson.text_to_speech(tts_credentials);

app.get('/synthesize', function(req, res) {
  console.log ("Synthesizing response: "+JSON.stringify(req.query));
  var transcript = textToSpeech.synthesize(req.query);
  transcript.on('response', function(response) {
    if (req.query.download) {
      response.headers['content-disposition'] = 'attachment; filename=transcript.ogg';
    }
  });
  transcript.on('error', function(error) {
    console.log('Synthesize error: ', error)
  });
  transcript.pipe(res);
});

// ----------------------------------------------------------------------

// redirect to https if the app is not running locally
if (!!process.env.VCAP_SERVICES) {
  app.enable('trust proxy');
  app.use (function (req, res, next) {
    if (req.secure) {
      next();
    }
    else {
      res.redirect('https://' + req.headers.host + req.url);
    }
  });
}

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
