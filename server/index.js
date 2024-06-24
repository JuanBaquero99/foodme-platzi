// Uncomment after adding New Relic agent to project
const newrelic = require('newrelic');

const express = require('express');
const logger = require('pino')(); // Setting up logger using Pino
const morgan = require('morgan'); // Logging middleware for Express
const bodyParser = require('body-parser'); // Middleware for parsing JSON request bodies

const fs = require('fs');
const open = require('open');

const RestaurantRecord = require('./model').Restaurant; // Importing RestaurantRecord class from a local file
const MemoryStorage = require('./storage').Memory; // Importing in-memory storage implementation from a local file

// Constants for API routes
const API_URL = '/api/restaurant';
const API_URL_ID = API_URL + '/:id';
const API_URL_ORDER = '/api/order';

// Utility function to remove 'menuItems' property from a restaurant
var removeMenuItems = function(restaurant) {
  var clone = {};

  // Cloning the object while omitting the 'menuItems' property
  Object.getOwnPropertyNames(restaurant).forEach(function(key) {
    if (key !== 'menuItems') {
      clone[key] = restaurant[key];
    }
  });

  return clone;
};

// Exported main function to initialize and configure the server
exports.start = function(PORT, STATIC_DIR, DATA_FILE, TEST_DIR) {
  var app = express(); // Creating an instance of Express
  var storage = new MemoryStorage(); // Creating an instance of in-memory storage

  // Middleware to log all HTTP requests
  app.use(morgan('combined'));

  // Middleware to serve static files from the specified directory
  app.use(express.static(STATIC_DIR));

  // Middleware to parse JSON request bodies
  var jsonParser = bodyParser.json();

  // RESTful API routes

  // Endpoint to get all restaurants
  app.get(API_URL, function(req, res, next) {
    res.send(200, storage.getAll().map(removeMenuItems));
  });

  // Endpoint to add a new restaurant
  app.post(API_URL, function(req, res, next) {
    var restaurant = new RestaurantRecord(req.body);
    var errors = [];

    // Validation of the restaurant and storing if successful
    if (restaurant.validate(errors)) {
      storage.add(restaurant);
      return res.send(201, restaurant);
    }

    return res.send(400, {error: errors});
  });

  // Endpoint to process an order (order creation)
  app.post(API_URL_ORDER, jsonParser, function(req, res, next) {
    logger.info(req.body, 'checkout');

    /*************************************
    /*         Custom attributes         *
    /*************************************/
    // Example of logging custom attributes with New Relic
    var order = req.body;
    var itemCount = 0;
    var orderTotal = 0;
    order.items.forEach(function(item) { 
      itemCount += item.qty;
      orderTotal += item.price * item.qty;
    });
    
    
    newrelic.addCustomAttributes({
      'customer': order.deliverTo.name,
      'restaurant': order.restaurant.name,
      'itemCount': itemCount,
      'orderTotal': orderTotal
    });


    // Responding with the generated order ID
    return res.send(201, { orderId: Date.now()});
  });

  // Endpoint to get a restaurant by its ID
  app.get(API_URL_ID, function(req, res, next) {
    var restaurant = storage.getById(req.params.id);
    if (restaurant) {
      return res.send(200, restaurant);
    }
    return res.send(400, {error: 'No restaurant with id "' + req.params.id + '"!'});
  });

  // Endpoint to update a restaurant by its ID
  app.put(API_URL_ID, function(req, res, next) {
    var restaurant = storage.getById(req.params.id);
    var errors = [];

    // Updating existing restaurant
    if (restaurant) {
      restaurant.update(req.body);
      return res.send(200, restaurant);
    }

    // Creating a new restaurant if one doesn't exist with that ID
    restaurant = new RestaurantRecord(req.body);
    if (restaurant.validate(errors)) {
      storage.add(restaurant);
      return res.send(201, restaurant);
    }

    return res.send(400, {error: errors});
  });

  // Endpoint to delete a restaurant by its ID
  app.delete(API_URL_ID, function(req, res, next) {
    if (storage.deleteById(req.params.id)) {
      return res.send(204, null);
    }
    return res.send(400, {error: 'No restaurant with id "' + req.params.id + '"!'});
  });

  // Initial read of data from JSON file and server startup
  fs.readFile(DATA_FILE, function(err, data) {
    if (err) {
      console.error('Error reading data file:', err);
      return;
    }

    // Parsing JSON data and storing in in-memory storage
    JSON.parse(data).forEach(function(restaurant) {
      storage.add(new RestaurantRecord(restaurant));
    });

    // Starting server on specified port
    app.listen(PORT, function() {
      open('http://localhost:' + PORT + '/');
      // console.log('Go to http://localhost:' + PORT + '/');
    });
  });

  // Signal handler to save restaurant data to JSON file before exiting
  try {
    process.on('SIGINT', function() {
      fs.writeFile(DATA_FILE, JSON.stringify(storage.getAll()), function(err) {
        if (err) {
          console.error('Error saving data:', err);
        }
        process.exit(0);
      });
    });
  } catch (e) {
    console.error('Error setting up SIGINT handler:', e);
  }
};