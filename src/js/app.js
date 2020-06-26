/* 
 * Made by: Willy Gilbert
 *    Date: May 22, 2020
 * Collage: MITT
 * Program: Software Developer
 * Subject: Offline First Applications using Javascript
 * Project: Final Project
 */

/*
 * This function receives from the function addEventForm the parameters searchPlace and geographicalPoint that are used to 
 * obtain a list of locations from the mapBox API that match searchPlace and to place them in the form indicated by the 
 * geographicalPoint (origin or destination). The function also has a coordinate box (borderBoxWinnipeg) that borders 
 * the city of Winnipeg, where urban public transportation works.
 */
function getLocationsList(searchPlace, geographicalPoint) {
  const mapBoxAPIKey = `pk.eyJ1IjoibWlsaXRvbSIsImEiOiJja2E2YmtpN2cwNmhzMnlvejA0cm5kamtpIn0.DvZmdFkPPyBWuuW-TgOpTw`;
  const borderBoxWinnipeg = {
    initialLat: 49.766204,
    initialLong: -97.325875,
    finalLat: 49.99275,
    finalLong: -96.953987,
  };
  const mapBorderBox = `${borderBoxWinnipeg.initialLong},${borderBoxWinnipeg.initialLat},${borderBoxWinnipeg.finalLong},${borderBoxWinnipeg.finalLat}`;

  fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${searchPlace}.json?access_token=${mapBoxAPIKey}&limit=10&bbox=${mapBorderBox}`)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      } else {
        throw Error(resp.statusText);
      }
    })
    .then(data => {
      let locationsList = [];
      if (data.features.length !== 0) {
        data.features.forEach(element => {
          locationsList.push({ name: element.place_name.split(`,`)[0], area: element.place_name.split(`,`)[1].trim(), long: element.center[0], lat: element.center[1] });
        });
        drawLocationsList(locationsList, geographicalPoint);
      } else {
        canNotFindLocation(searchPlace, geographicalPoint);
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}

/*
 * This function prints on screen when there are no locations available for a search.
 */
function canNotFindLocation(searchPlace, geographicalPoint) {
  let ubication = `at Starting Location`;
  if (geographicalPoint !== `origins`) ubication = `at Destination`;
  let message = `We can't find "${searchPlace} ${ubication}". Make sure your search is spelled correctly.`;
  document.querySelector(`.bus-container`).innerHTML = `<ul class="my-trip wrong-location">${message}.</ul>`;
  document.querySelector(`.${geographicalPoint}`).innerHTML = ``;
}

/*
 * This function receives from the getLocationsList function the locationsList and geographicalPoint parameters that are used to 
 * present the list of locations and to display it in the form indicated by the geographicalPoint (origin or destination), through HTML.
 */
function drawLocationsList(locationsList, geographicalPoint) {
  const point = document.querySelector(`.${geographicalPoint}`);
  document.querySelector(`.bus-container`).innerHTML = ``;
  point.innerHTML = ``;
  locationsList.forEach(location => {
    point.innerHTML += `
    <li data-long="${location.long}" data-lat="${location.lat}">
      <div class="name">${location.name}</div>
      <div>${location.area}</div>
    </li>
    `;
  });
}

/*
 * This function receives the length and latitude of the point of origin, as well as the destination. With these values, consult 
 * the travel routes in the api.winnipegtransit.com API and send the first 3 trips found to be displayed on the screen.
 */
function getTripPlans(originLat, originLong, destinationLat, destinationLong) {
  const WpgTransitAPIKey = `5yygnE3Lb4Cl0NgfrQgk`;
  let originGeolocation = `geo/${originLat},${originLong}`;
  let destinationGeolocation = `geo/${destinationLat},${destinationLong}`;
  const busContainerHTML = document.querySelector(`.bus-container`);
  busContainerHTML.innerHTML = ``;
  fetch(`https://api.winnipegtransit.com/v3/trip-planner.json?api-key=${WpgTransitAPIKey}&origin=${originGeolocation}&destination=${destinationGeolocation}`)
    .then(resp => {
      if (resp.ok) {
        return resp.json();
      } else {
        canNotTrips(`There are currently no trips available between these two locations. Please try later`);
      }
    })
    .then(data => {
      let tripNumber = 0;
      let numberOfTripsToShow = 3;
      if (data.plans.length !== 0) {
        while (tripNumber < data.plans.length && tripNumber < numberOfTripsToShow) {
          getTripPlanSegment(busContainerHTML, tripNumber, data.plans[tripNumber++].segments);
        }
      } else {
        canNotTrips(`There are currently no trips available between these two locations. Please try later`);
      }
    })
    .catch(function(error) {
      console.log(error);
    });
}

/*
 * This function prints on screen when trips between two locations are not available.
 */
function canNotTrips(message) {
  document.querySelector(`.bus-container`).innerHTML = `<ul class="my-trip wrong-location">${message}.</ul>`;
}

/*
 * This function creates a container for travel routes and builds the string that will be shown on the screen for each segment of the trip.
 * each segment of the trip is classified into walk, ride and transfer and a specific treatment is applied to each segment, to show 
 * the information that best suits the type of segment of the trip.
 */
function getTripPlanSegment(busContainerHTML, tripNumber, tripPlan) {
  let tripClass = `trip-number`;
  let tripTitle = `Recommended Trip`;
  if (tripNumber > 0) {
    tripClass += tripNumber;
    tripTitle = `Alternative trip Number ${tripNumber}`;
  }

  busContainerHTML.innerHTML += `<ul class="my-trip ${tripClass}"> <strong>${tripTitle}</strong></ul>`;
  const myTripHTML = document.querySelector(`.${tripClass}`);
  tripPlan.forEach(function(trip) {
    if (trip.type === `walk`) {
      let name = `your destination`;
      let stop = `to `;
      if (trip.to !== undefined) {
        if (trip.to.stop !== undefined) {
          name = `- ${trip.to.stop.name}`;
          stop = `to stop #${trip.to.stop.key}`;
        }
      }
      drawTripPlanSegment(myTripHTML, `walk`, `${trip.type} for ${getTime(trip.times.durations.total)} ${stop} ${name}.`);
    }

    if (trip.type === `ride`) {
      let name = ``;
      trip.route.name === undefined ? name = trip.route.number : name = trip.route.name;
      drawTripPlanSegment(myTripHTML, `ride`, `${trip.type} the ${name} for ${getTime(trip.times.durations.total)}.`);
    }

    if (trip.type === `transfer`) {
      drawTripPlanSegment(myTripHTML, `transfer`, `${trip.type} from stop #${trip.from.stop.key} - ${trip.from.stop.name} to stop #${trip.to.stop.key} - ${trip.to.stop.name}.`);
    }
  });
}

/*
 * This function displays each segment of each trip on the screen through HTML.
 */
function drawTripPlanSegment(myTripHTML, conveyance, routeDetail) {
  myTripHTML.innerHTML += `
    <li>
    <i class="${getIconClass(conveyance)}" aria-hidden="true"></i>${routeDetail.capitalize()}
    </li>
  `;
}

/*
 * This function returns the type of icon depending on which segment of the trip is being consulted walk, ride or transfer.
 */
function getIconClass(conveyance) {
  const icon = {
    walk: `fas fa-walking`,
    ride: `fas fa-bus`,
    transfer: `fas fa-ticket-alt`,
  };
  return icon[conveyance];
}
/*
 * Class extension which capitalizes the first word of each sentence. By jniziol.
 */
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

/*
 * This function receives an integer that represents the number of minutes and returns the hours and minutes in words if applicable.
 * Apply pural and singular if it is one minute or several minutes respectively. The same goes for the hours.
 */
function getTime(minutes) {
  let hour = 0;
  let newMinutes = getMinutes(minutes);
  if (minutes > 59) {
    hour = Math.floor(minutes / 60);
    hour > 1 ? hour += " hours" : hour += " hour";
    if (newMinutes !== ``) hour += "and " + newMinutes;
    return hour;
  } else {
    return getMinutes(minutes);
  }
}

/*
 * This function returns the number of minutes in words. and supports the getTime function.
 */
function getMinutes(minutes) {
  let newMinutes = minutes % 60;
  if (newMinutes === 0) return `less than one minute`;
  return newMinutes > 1 ? newMinutes += " minutes" : newMinutes += " minute";
}

/*
 * Main function that initializes listening for button click events and location search.
 */
function main() {
  addEventForm(`origin`);
  addEventForm(`destination`);
  const planTripButton = document.querySelector(`.plan-trip`);
  planTripButton.addEventListener('click', function(event) {
    getTrip();
  });
}

function addEventForm(form) {
  const originsForm = document.querySelector(`.${form}-form`);
  originsForm.addEventListener('submit', function(event) {
    event.preventDefault();
    getLocationsList(event.target[0].value, `${form}s`);
    event.target[0].value = "";
  });

  const origins = document.querySelector(`.${form}s`);
  origins.addEventListener('click', function(event) {
    if (event.target.nodeName === 'DIV') setSelected(event.target.parentNode, `${form}s`);
    if (event.target.nodeName === 'LI') setSelected(event.target, `${form}s`);
  });
}

/*
 * This function selects or deselects the location element of both the source and destination forms when 
 * a user clicks on it.
 */
function setSelected(node, geographicalPoint) {
  const selectedPoint = document.querySelector(`.${geographicalPoint} > .selected`);
  if (selectedPoint !== null) selectedPoint.classList.remove("selected");
  node.classList.add("selected");
  validateEqualLocations(document.querySelector(`.bus-container`));
}

/*
 * This function takes the coordinates of the origin and destination and sends the getTripPlans function 
 * to deploy the first 3 trips available between these two points.
 */
function getTrip() {
  const originSelected = document.querySelector(`.origins > .selected`);
  const destinationSelected = document.querySelector(`.destinations > .selected`);
  getTripPlans(originSelected.dataset.lat, originSelected.dataset.long, destinationSelected.dataset.lat, destinationSelected.dataset.long);
}

/*
 * This function validates if the two selected locations, both the source and the destination are the same location.
 * If they are the same location, disable the "Plan My Trip" button and display a message on the screen indicating 
 * that "Please select two different locations.". While the user does not select two different locations, 
 * it is not possible to search for the trips.
 */
function validateEqualLocations(busContainerHTML) {
  const originSelected = document.querySelector(`.origins > .selected`);
  const destinationSelected = document.querySelector(`.destinations > .selected`);
  if (originSelected !== null && destinationSelected !== null) {
    if (originSelected.dataset.lat === destinationSelected.dataset.lat && originSelected.dataset.long === destinationSelected.dataset.long) {
      busContainerHTML.innerHTML = `<ul class="my-trip wrong-location"> <strong>Please select two different locations.</strong></ul>`;
      document.querySelector(`.plan-trip`).disabled = true;
    } else {
      busContainerHTML.innerHTML = ``;
      document.querySelector(`.plan-trip`).disabled = false;
    }
  }
}

/*
 * Initialize the program
 */
main();