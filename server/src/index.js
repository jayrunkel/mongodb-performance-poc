var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');
var app = express();
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
var config = require('config');
var Stopwatch = require("statman-stopwatch");
var moment = require('moment')

var clientHandle = null;

app.use(bodyParser.json());

app.post('/test_run/:id', function(req, res, next) {
    logRequest('POST', "/test_run", req.params );
    test_id = req.params['id'];
  
    const collection = getCollection(clientHandle);
    doc = { _id : test_id, last_modified : new Date() };
    collection.insertOne(doc, function(err, result) {
        if (err) {
            res.json({message : 'Error: ' + err});
        }
	else {
            res.status(201).json({ test_id : test_id, message : 'Created test run: ' + test_id });
        }
        next();
    });
})

app.post('/test_run/:id/log', function(req, res, next) {
    logRequest('POST', "/test_run/id/log", req.params );
    test_id = req.params['id'];
  
    const collection = getLogCollection(clientHandle);
    doc = { test_id : test_id, inserted : new Date(), data : req.body };
    collection.insertOne(doc, function(err, result) {
        if (err) {
            res.json({message : 'Error: ' + err});
        }
	else {
            res.status(201).json({ test_id : test_id, message : 'Logged event: ' + test_id });
        }
        next();
    });
})

app.get('/test_run/:id', function(req, res, next) {
    logRequest('GET', "/test_run", req.params );
    test_id = req.params['id'];

    const collection = getCollection(clientHandle);
    collection.findOne({ _id : test_id }, function(err, result) {
        if (err) {
            res.json( { message : 'Error: ' + err});
        }
        else {
            res.json(result);
        }
        next();
    });
})


app.delete('/test_run/:id', function(req, res, next) {
    logRequest('DELETE', "/test_run", req.params );
    test_id = req.params['id'];

    const collection = getCollection(clientHandle);
    collection.deleteOne({ _id : test_id }, function(err, result) {
        if (err) {
            res.json({message : 'Error: ' + err});
        }
        else {
            res.json({message : 'Deleted test run: ' + test_id});
        }
        next();
      });
})


// Called by template functions and to look up variables
app.patch('/test_run/:id', function(req, res, next) {
    logRequest('POST', "/test_run", req.params);
    logRequest('POST', "/test_run", req.body);
    test_id = req.params['id'];

    // Parse payload
    payload = req.body;
    measurement_name = payload.measurement_name;
    measurements = {}
    measurements[measurement_name] = { '$each' : payload.measurements };
    
    updateFilter = { _id : test_id };
    updateAction = { '$push' : measurements, '$set' : { last_modified : new Date()} };
    updateOptions = { upsert : true }
    const collection = getCollection(clientHandle);
    collection.updateOne(updateFilter, updateAction, updateOptions, function(err, result) {
        if (err) {
            res.json({message : 'Error: ' + err});
        }
        else
        {
            res.json({message : 'ok'});
        }
        next();
      });
})

app.use(function(error, req, res, next) {
  // Any request to this server will get here, and will send an HTTP
  // response with the error message
  console.log(error)
  res.status(500).json({ message: error.message });
});

// Get config from server/default.json
var serverConfig = config.get('server');

MongoClient.connect(serverConfig.mongodb_url, { useNewUrlParser : true }, function(err, client) {
    if ( err != null ) {
	res.send({ status : "error", 
                   display_status : "Error", 
                   message : 'MongoDB Connection Error: ' + err.message });
    }
    else {
	clientHandle = client;
	app.listen(serverConfig.port);
    }
})

console.log("Server is listening on port " + serverConfig.port);

function getCollection(client)
{
  return client.db('poc_data').collection('test_run');
}

function getLogCollection(client) {
    return client.db('poc_data').collection('event_data');
}

function logRequest(verb, type, data)
{
  if (serverConfig.logRequests)
  {
    console.log(verb + ": " + type + ":\n" + JSON.stringify(data,null,2))
  }
}

function logQuery(query, options)
{
  if (serverConfig.logQueries)
  {
    console.log("Query:")
    console.log(JSON.stringify(query,null,2))
    if ( options != null )
    {
      console.log("Query Options:")
      console.log(JSON.stringify(options,null,2))
    }
  }
}

function logTiming(body, elapsedTimeMs)
{
  if (serverConfig.logTimings)
  {
    var range = new Date(body.range.to) - new Date(body.range.from)
    var diff = moment.duration(range)
    
    console.log("Request: " + intervalCount(diff, body.interval, body.intervalMs) + " - Returned in " + elapsedTimeMs.toFixed(2) + "ms")
  }
}

