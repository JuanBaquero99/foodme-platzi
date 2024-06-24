// Utility function to generate an ID from a name by converting to lowercase and removing non-word characters
var idFromName = function(name) {
  return name && name.toLowerCase().replace(/\W/g, '');
};

// Utility function to check if a value is a string
var isString = function(value) {
  return typeof value === 'string';
};

// Object mapping short day names to their corresponding numeric representation
var DAYS = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6
};

// Function to parse a comma-separated string of days into an array of numeric day representations
var parseDays = function(str) {
  return str.split(',').map(function(day) {
    return DAYS[day];
  });
};

// Constructor function for Restaurant objects
var Restaurant = function(data) {
  // Default values
  this.days = [1, 2, 3, 4, 5, 6]; // Default days of operation
  this.menuItems = []; // Empty array for menu items
  this.price = 0; // Default price
  this.rating = 0; // Default rating

  // Update restaurant object with provided data
  this.update(data);

  // Generate an ID from the name if not already provided
  this.id = this.id || idFromName(this.name);
};

// Method to update Restaurant object with new data
Restaurant.prototype.update = function(data) {
  Object.keys(data).forEach(function(key) {
    // Convert price and rating to integers if they are strings
    if ((key === 'price' || key === 'rating') && isString(data[key])) {
      this[key] = parseInt(data[key], 10);
    } else {
      this[key] = data[key];
    }
  }, this);

  // Map menu items to MenuItem objects
  this.menuItems = this.menuItems.map(function(data) {
    return new MenuItem(data);
  });
};

// Method to validate Restaurant object
Restaurant.prototype.validate = function(errors) {
  if (!this.name) {
    errors.push('Invalid: "name" is a mandatory field!');
  }

  return errors.length === 0;
};

// Static method to create a Restaurant object from an array of data
Restaurant.fromArray = function(data) {
  return new Restaurant({
    id: data[1],
    name: data[0],
    cuisine: data[2],
    opens: data[3],
    closes: data[4],
    days: parseDays(data[5]),
    price: parseInt(data[6], 10),
    rating: parseInt(data[7], 10),
    location: data[8],
    description: data[9]
  });
};

// Constructor function for MenuItem objects
var MenuItem = function(data) {
  this.name = data.name;
  this.price = data.price;
};

// Static method to create a MenuItem object from an array of data
MenuItem.fromArray = function(data) {
  return new MenuItem({
    name: data[1],
    price: parseFloat(data[2])
  });
};

// Exporting Restaurant and MenuItem constructors
exports.Restaurant = Restaurant;
exports.MenuItem = MenuItem;