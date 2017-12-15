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
    path = require('path'),
    fs = require('fs'),
    unirest = require('unirest'),
    ISO6391 = require('iso-639-1'),
    extend = require('util')._extend;

// Setup static public directory
app.use(express.static(path.join(__dirname , './public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Add error handling in dev
if (!process.env.VCAP_SERVICES) {
  app.use(errorhandler());
}


// When running on Bluemix we will get config data from VCAP_SERVICES
// and a user variable named VCAP_SERVICES
// When running locally we will read config from 'vcap-local.json'
var vcapServices = process.env.VCAP_SERVICES;
if (!vcapServices) {
  console.log ("No VCAP_SERVICES variable so we will read vcap-local.json");
  vcapServices = {};
} else {
  vcapServices = JSON.parse(vcapServices);
  console.log("Data from process.env.VCAP_SERVICES"+JSON.stringify(vcapServices));
}
if (fs.existsSync("vcap-local.json")) {
  //When running locally, the VCAP_SERVICES will not be set so read from vcap-local.json
  var jsonData = fs.readFileSync("vcap-local.json", "utf-8");
  // console.log ("vcap-local.json contents\n"+jsonData);
  var localJSON = JSON.parse(jsonData);
  console.log ("Parsed local data: "+JSON.stringify(localJSON));
  // we use extend to merge vcap-local.json with the environment variable
  // if both exist, local wins
  vcapServices = extend(vcapServices,localJSON);
}
//if (!vcapServices.speech_to_text || !vcapServices.text_to_speech || !vcapServices.language_translator)
var stt_env = vcapServices.speech_to_text[0].credentials;
console.log('STT configuration '+JSON.stringify(stt_env));
var tts_env = vcapServices.text_to_speech[0].credentials;
console.log('TTS configuration '+JSON.stringify(tts_env));
var mt_env = vcapServices.language_translator[0].credentials;
console.log('MT configuration '+JSON.stringify(mt_env));
if (!stt_env)
  throw('Incomplete configuration '+JSON.stringify(vcapServices));

var stt_credentials = {version: 'v1', url: stt_env.url, username: stt_env.username, password: stt_env.password};
console.log('stt_credentials: '+JSON.stringify(stt_credentials));
var tts_credentials = {version: 'v1', url: tts_env.url, username: tts_env.username, password: tts_env.password};
console.log('tts_credentials: '+JSON.stringify(tts_credentials));
var mt_credentials = {version: 'v2', url: mt_env.url, username: mt_env.username, password: mt_env.password};
console.log('mt_credentials: '+JSON.stringify(mt_credentials));

// ------------------------------- STT ---------------------------------
// Get an authorization key for the STT service
var authorization = watson.authorization(stt_credentials);
if (authorization) {
  console.log ('authorization: '+JSON.stringify(authorization));
} else {
  throw('Failed to get auth key for STT service');
}

// Get token from Watson using your credentials
app.get('/token', function(req, res) {
  //console.log ("Getting a token with credentials "+JSON.stringify(stt_credentials));
  authorization.getToken({url: stt_credentials.url}, function(err, token) {
    if (err) {
      console.log('getToken error:', err);
      res.status(err.code);
      var err_text = 'Failed to connect to IBM Watson Speech-to_Text service - check your internet connection.\n'+err;
      return res.status(500).json({
        'output': {
          'text': err_text
          }}); // the converstion service returned an error
    }
    console.log ('getToken returns: '+JSON.stringify(token));
    res.send(token);
  });
});

// L.R.
// ------------------------------- MT ---------------------------------
var language_translation = watson.language_translation(mt_credentials);
app.post('/api/translate', function(req, res, next) {
  var params = extend({ 'X-WDC-PL-OPT-OUT': req.header('X-WDC-PL-OPT-OUT')}, req.body);
  console.log(' ---> MT params: ' + JSON.stringify(params)); //L.R.
  var url = mt_credentials.url + '/v2/translate?version=2017-07-01';
  console.log(' ---> translation URL '+url+' param '+JSON.stringify(params));
  unirest.post(url).header('Accept', 'application/json')
  .header('X-Watson-Technology-Preview','2017-07-01')
  .auth(mt_credentials.username, mt_credentials.password, true)
  .send(params)
  .end(function (response) {
    if (response.error) {
      console.log('new style call to get NMT models failed - try the old way');
      language_translation.translate(params, function(err, models) {
      if (err)
        return next(err);
      else
        res.json(models);
      });
    } else {
      console.log(' ---> response code: '+response.code+' JSON: '+JSON.stringify(response.body));
      res.json(response.body);
    }
  });

  // calling the official library
  // language_translation.translate(params, function(err, models) {
  // if (err)
  //   return next(err);
  // else
  //   res.json(models);
  // });
});

app.get('/api/models', function(req, res, next) {
  console.log('Server is getting a list of translation model for a browser client');

  // get both the original MT models list and the new Neural MT type mtModels
  var models_url = mt_credentials.url + '/v2/models?version=2017-07-01';
  console.log(' ---> get NMT models URL '+models_url);
  console.log ('user='+mt_credentials.username+" password="+mt_credentials.password)
  unirest.get(models_url)
  .header('Accept', 'application/json')
  .header('X-Watson-Technology-Preview','2017-07-01')
  .auth(mt_credentials.username, mt_credentials.password, true)
  .send()
  .end(function (response) {
    console.log(' ---> NMT models response code: '+response.code+' JSON: '+JSON.stringify(response.body));
    if (response.error) {
        console.log('New style call to get models failed so try again the old way');
        var params = {};
        language_translation.getModels(params, function(err, models) {
        if (err) {
          console.log('old way failed also so give up')
          return next(err);
        } else {
          console.log('Adding language names to returned JSON')
          var mtModels = models.models;
          //console.log("Original JSON: "+JSON.stringify(mtModels));
          for (var i=0; i<mtModels.length; i++) {
            mtModels[i].source_name = ISO6391.getName(mtModels[i].source);
            mtModels[i].target_name = ISO6391.getName(mtModels[i].target);
            //console.log(i+": Translate "+mtModels[i].source_name+" to "+mtModels[i].target_name+" with model "+mtModels[i].model_id);
          }
          //console.log("Enhanced JSON: "+JSON.stringify(mtModels));
          console.log("returning "+mtModels.length+" MT models");
          res.json(mtModels);
        }
      });
    } else {
      console.log('Adding language names to returned JSON')
      var nmt_models = response.body.models;
      // Get the name of each source/target language (it is easier done ofn the server)
      for (var i=0; i<nmt_models.length; i++) {
        nmt_models[i].source_name = ISO6391.getName(nmt_models[i].source);
        nmt_models[i].target_name = ISO6391.getName(nmt_models[i].target);
        console.log(" NMT model "+i+": Translate "+nmt_models[i].source_name+" to "+nmt_models[i].target_name+" with model "+nmt_models[i].model_id);
      }
      res.json(nmt_models);
    }
  });

  // The official way of doing it
  // language_translation.getModels(params, function(err, models) {
  //   if (err) {
  //     return next(err);
  //   } else {
  //     var mtModels = models.models;
  //     //console.log("Original JSON: "+JSON.stringify(mtModels));
  //     for (var i=0; i<mtModels.length; i++) {
  //       mtModels[i].source_name = ISO6391.getName(mtModels[i].source);
  //       mtModels[i].target_name = ISO6391.getName(mtModels[i].target);
  //       //console.log(i+": Translate "+mtModels[i].source_name+" to "+mtModels[i].target_name+" with model "+mtModels[i].model_id);
  //     }
  //     //console.log("Enhanced JSON: "+JSON.stringify(mtModels));
  //     console.log("returning "+mtModels.length+" MT models");
  //     res.json(mtModels);
  //   }
  // });
});

// ----------------------------------------------------------------------

// L.R.
// -------------------------------- TTS ---------------------------------
var textToSpeech = watson.text_to_speech(tts_credentials);

app.get('/synthesize', function(req, res) {
  var transcript = textToSpeech.synthesize(req.query);
  console.log ('synthesize query: '+JSON.stringify(req.query));
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

// start listening
var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port).on('error', console.log);

console.log('listening at:', port);
