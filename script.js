'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const editWorkout = document.querySelector('#edit');
const editType = document.querySelector('.form__edit--type');
const editDistance = document.querySelector('.form__edit--distance');
const editDuration = document.querySelector('.form__edit--duration');
const editCadence = document.querySelector('.form__edit--cadence');
const editElevation = document.querySelector('.form__input--elevation');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const description = document.querySelector('.description');
const locale = navigator.language;

class App {
  #mapZoomLevel = 13;
  #mymap;
  #mapEvent;
  #workouts = [];
  #popups = [];
  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout);
    editWorkout.addEventListener('submit', this._editWorkout);
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup);
    containerWorkouts.addEventListener('click', this._showEdit);
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap,
      this._errorPosition
    );
  }

  _showForm = event => {
    description.classList.add('description--hidden');
    editWorkout.classList.add('hidden');
    inputType.parentElement.style.display = '';
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _showEdit = e => {
    const workoutEdit = e.target.closest('.workout');

    if (
      !e.target.closest('.workout__edit') &&
      !e.target.closest('.workout__delete')
    ) {
      return;
    }

    const workout = this.#workouts.find(
      work => work.getId() === workoutEdit.dataset.id
    );
    if (
      e.target.closest('.workout__delete') &&
      confirm('Delete for eternity ?')
    ) {
      this.#workouts = this.#workouts.filter(w => {
        return workoutEdit.dataset.id != w.getId();
      });

      if (this.#workouts.length == 0) {
        description.classList.remove('description--hidden');
      }
      workoutEdit.remove();
      this._setLocalStorage();

      this.#popups = this.#popups.filter(w => {
        if (workoutEdit.dataset.id == w.options.id) {
          this.#mymap.removeLayer(w);
          return false;
        } else {
          return true;
        }
      });

      return;
    }
    form.classList.add('hidden');
    editWorkout.setAttribute('data-id', workoutEdit.dataset.id);

    document.querySelector(
      '.form__edit--distance'
    ).value = workout.getDistance();
    document.querySelector(
      '.form__edit--duration'
    ).value = workout.getDuration();

    if (workout.getType() === 'cycling') {
      document
        .querySelector('.form__edit--elevation')
        .parentElement.classList.remove('form__row--hidden');

      document
        .querySelector('.form__edit--cadence')
        .parentElement.classList.add('form__row--hidden');

      document.querySelector(
        '.form__edit--elevation'
      ).value = workout.getElevation();
      editWorkout.setAttribute('data-type', 'cycling');
    }
    if (workout.getType() === 'running') {
      document
        .querySelector('.form__edit--elevation')
        .parentElement.classList.add('form__row--hidden');
      document
        .querySelector('.form__edit--cadence')
        .parentElement.classList.remove('form__row--hidden');
      document.querySelector(
        '.form__edit--cadence'
      ).value = workout.getCadence();
      editWorkout.setAttribute('data-type', 'running');
    }
    editWorkout.classList.remove('hidden');
  };

  _loadMap = position => {
    const { latitude, longitude } = position.coords;
    this.#mymap = L.map('mapid').setView(
      [latitude, longitude],
      this.#mapZoomLevel
    );
    L.tileLayer(
      'https://api.mapbox.com/styles/v1/carlolis/cknar1pgv021r17o7xgmr0ljm/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiY2FybG9saXMiLCJhIjoiY2tuYXFlOWkwMHFmZTJ3bGNsZnhtcWI5OSJ9.TOEpriP_eQpEovQPcLQScA',
      {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'cknar1pgv021r17o7xgmr0ljm',
        tileSize: 512,
        zoomOffset: -1,
        accessToken:
          'pk.eyJ1IjoiY2FybG9saXMiLCJhIjoiY2tuYXFlOWkwMHFmZTJ3bGNsZnhtcWI5OSJ9.TOEpriP_eQpEovQPcLQScA',
      }
    ).addTo(this.#mymap);
    this.#mymap.on('click', this._showForm);

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  };

  _errorPosition(error) {
    if (error != 'null') {
      alert('Could not get your position.');
    }
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _isValidInputs = (...inputs) => {
    return inputs.every(number => Number.isFinite(number) && number > 0);
  };
  _newWorkout = event => {
    event.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    //If workout running, create running object
    if (type == 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (!this._isValidInputs(distance, duration, cadence)) {
        return alert('Inputs have to be positive numbers.');
      }
      workout = new Running(this.#mapEvent.latlng, distance, duration, cadence);
    }
    //If workout cycling, create running object
    if (type == 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid
      if (!this._isValidInputs(distance, duration, Math.abs(elevation))) {
        return alert('Inputs have to be positive numbers.');
      }
      workout = new Cycling(
        this.#mapEvent.latlng,
        distance,
        duration,
        elevation
      );
    }
    //Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker and Hide form and clear input fields
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Set local storage to all workouts
    this._setLocalStorage();
  };

  _editWorkout = event => {
    event.preventDefault();

    //Get data from form
    const type = editWorkout.dataset.type;
    const distance = +editDistance.value;
    const duration = +editDuration.value;
    const workout = this.#workouts.find(
      work => work.getId() === editWorkout.dataset.id
    );
    //If workout running, create running object
    if (type == 'running') {
      const cadence = +editCadence.value;

      //Check if data is valid
      if (!this._isValidInputs(distance, duration, cadence)) {
        return alert('Inputs have to be positive numbers.');
      }
      workout.setCadence(cadence);
      workout.setDistance(distance);
      workout.setDuration(duration);
    }
    //If workout cycling, create running object
    if (type == 'cycling') {
      const elevation = +editElevation.value;
      //Check if data is valid
      if (!this._isValidInputs(distance, duration, Math.abs(elevation))) {
        return alert('Inputs have to be positive numbers.');
      }
      workout.setElevationGain(elevation);
      workout.setDistance(distance);
      workout.setDuration(duration);
    }
    editWorkout.classList.add('hidden');

    document.querySelector(`[data-id='${editWorkout.dataset.id}']`).remove();
    this._renderWorkout(workout);
    this._setLocalStorage();
  };

  _renderWorkoutMarker(workout) {
    this.#popups.push(
      L.marker(Object.values(workout.getLocation()), { id: workout.getId() })
        .addTo(this.#mymap)
        .bindPopup(
          L.popup({
            autoClose: false,
            maxWidth: 250,
            minWidth: 100,
            closeOnClick: false,
            className: 'workout--' + workout.getType(),
          })
        )
        .openPopup()
        .setPopupContent(
          `${
            workout.getType() === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          } ${workout.getDescription()}`
        )
    );

    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.getType()}" data-id="${workout.getId()}">
    <h2 class="workout__title">${workout.getDescription()}</h2>
    <div class="workout__modify"><span class='workout__edit'>Edit</span><span class='workout__delete'>Delete</span></div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.getType() === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.getDistance()}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.getDuration()}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.getType() === 'running') {
      html += `
   <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.getPace().toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.getCadence()}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    if (workout.getType() === 'cycling') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.getSpeed().toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.getElevation()}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup = e => {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.getId() === workoutEl.dataset.id
    );
    this.#mymap.setView(
      Object.values(workout.getLocation()),
      this.#mapZoomLevel,
      {
        animate: true,
        pan: { duration: 1 },
      }
    );
    //using the public interface
    // workout.click();
  };

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data || data.length == 0) return;
    description.classList.add('description--hidden');
    const dataClass = data.map(work => this.toClass(work));

    this.#workouts = dataClass;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  toClass(work) {
    if (work.type == 'running') {
      const run = new Running(
        work.coords,
        work.distance,
        work.duration,
        work.cadence
      );
      run.setId(work.id);
      run.setDate(work.date);
      return run;
    }
    if (work.type == 'cycling') {
      const run = new Cycling(
        work.coords,
        work.distance,
        work.duration,
        work.elevationGain
      );
      run.setId(work.id);
      run.setDate(work.date);
      return run;
    }
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  date = new Date();
  id = new Date().toISOString().slice(-10);
  distance;
  duration;
  coords;
  description;
  // clicks = 0;
  constructor(coords, distance, duration) {
    this.setLocation(coords); // {lat, long}
    this.setDistance(distance); // in km
    this.setDuration(duration); // in min
  }
  _setDescription() {
    this.description = `${this.getType()
      .charAt(0)
      .toUpperCase()}${this.getType().slice(
      1
    )} on ${this.getDate().toLocaleString(locale, {
      day: 'numeric',
      month: 'long',
    })}`;
  }
  getDescription() {
    return this.description;
  }
  getId() {
    return this.id;
  }
  setId(id) {
    this.id = id;
  }

  setDistance(distance) {
    this.distance = distance;
    return this;
  }
  getDistance() {
    return this.distance;
  }

  setDuration(duration) {
    this.duration = duration;
    return this;
  }

  getDuration() {
    return this.duration;
  }

  setLocation(coords) {
    this.coords = coords;
  }
  getLocation() {
    return this.coords;
  }

  getDate() {
    return this.date;
  }
  setDate(date) {
    this.date = date;
  }

  // click() {
  //   this.clicks++;
  // }
}
class Running extends Workout {
  pace;
  cadence;
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.setCadence(cadence);
    this.calcPace();
    this._setDescription();
  }
  getType() {
    return this.type;
  }
  setCadence(cadence) {
    this.cadence = cadence;
  }
  getCadence() {
    return this.cadence;
  }
  calcPace() {
    this.pace = this.getDuration() / this.getDistance();
    return this.pace;
  }
  getPace() {
    return this.pace;
  }
}

class Cycling extends Workout {
  elevationGain;
  speed;
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.setElevationGain(elevationGain);
    this.calcSpeed();
    this._setDescription();
  }
  getType() {
    return this.type;
  }
  setElevationGain(elevationGain) {
    this.elevationGain = elevationGain;
  }
  getElevation() {
    return this.elevationGain;
  }
  getSpeed() {
    return this.speed;
  }
  calcSpeed() {
    this.speed = this.getDistance() / (this.getDuration() / 60);
    return this.speed;
  }
}

const newMap = new App();
