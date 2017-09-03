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
    // environmental variable points to demo's json config file
    extend = require('util')._extend;

    require('dotenv').config({silent: true});

// For local development, put username and password in config
// or store in your environment
if (!process.env.VCAP_SERVICES) {
  if (!process.env.STT_USER || !process.env.STT_PASS ||!process.env.TTS_USER || !process.env.TTS_PASS)
    throw new Error('When running locally, you must specify TTS/STT credentials in .env - see .env.example');

  if (!process.env.CONV_USER || !process.env.CONV_PASS || !process.env.CONV_WORKSPACE_ID)
    throw new Error('When running locally, you must specify conversation service credentials in .env - see .env.example');
}

var config = {
  version: 'v1',
  url: 'https://stream.watsonplatform.net/speech-to-text/api',
  username: process.env.STT_USER,
  password: process.env.STT_PASS
};

// if bluemix credentials exists, then override local
var credentials = extend(config, bluemix.getServiceCreds('speech_to_text'));
var authorization = watson.authorization(credentials);

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

// Setup static public directory
app.use(express.static(path.join(__dirname , './public')));
app.use(bodyParser.json());

// Get token from Watson using your credentials
app.get('/token', function(req, res) {
  authorization.getToken({url: credentials.url}, function(err, token) {
    if (err) {
      console.log('error:', err);
      res.status(err.code);
    }
    res.send(token);
  });
});


// L.R.
// -------------------------------- Conversation ---------------------------------

// Create the service wrapper - use credentials from environment file is running locally or from VCAP_SERVICES on Bluemix
var conv_credentials = extend({
  "url": "https://gateway.watsonplatform.net/conversation/api",
  version: 'v1',
  username: process.env.CONV_USER,
  password: process.env.CONV_PASS,
  version_date: Conversation.VERSION_DATE_2017_04_21
}, bluemix.getServiceCreds('conversation'));
var conversation = new Conversation(conv_credentials);

// Endpoint to the conversation service that will be called from the client side
app.post('/message', function(req, res) {
  var workspace =  process.env.CONV_WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the '
        + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>'
        + 'Once a workspace has been defined the intents may be imported from '
        + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  console.log ('Message sent to conversation service: '+JSON.stringify(req.body));
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {"text": ""}
  };

  // Send the input to the conversation service
  conversation.message(payload, function(err, data) {
    console.log ('Conversation service response: '+JSON.stringify(data));
    if (err) {
      return res.status(err.code || 500).json(err); // the converstion service returned an error
    }
    return res.json(data);
  });
});


// L.R.
// -------------------------------- TTS ---------------------------------
var tts_credentials = extend({
  url: 'https://stream.watsonplatform.net/text-to-speech/api',
  version: 'v1',
  username: process.env.TTS_USER,
  password: process.env.TTS_PASS
}, bluemix.getServiceCreds('text_to_speech'));

// Create the service wrappers
var textToSpeech = watson.text_to_speech(tts_credentials);

app.get('/synthesize', function(req, res) {
  console.log ("Synthesize response: "+JSON.stringify(req.query));
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

// Add error handling in dev
if (!process.env.VCAP_SERVICES) {
  app.use(errorhandler());
}
var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
