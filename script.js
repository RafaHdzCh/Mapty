'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout
{
    #date = new Date();
    id = (Date.now() + "").slice(-10);
    

    constructor(coords, distance, duration)
    {
        this.coords = coords; //[lat,lng]
        this.distance = distance; //Km
        this.duration = duration; //Min
    }

    SetDescription()
    {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.#date.getMonth()]} ${this.#date.getDate()}`;
    }
}

class Running extends Workout
{
    type = "running";
    constructor(coords, distance, duration, cadence)
    {
        super(coords,distance,duration);

        this.cadence = cadence;
        this.#CalculatePace();
        this.SetDescription();
    }

    #CalculatePace()
    {
        //min/km
        this.pace = this.duration/this.distance;
        return this.pace;
    }
}

class Cycling extends Workout
{
    type = "cycling";
    constructor(coords, distance, duration, elevationGain)
    {
        super(coords,distance,duration);

        this.cadence = elevationGain;
        this.#CalculateSpeed();
        this.SetDescription();
    }

    #CalculateSpeed()
    {
        //km/h
        this.speed = this.distance/(this.duration/60);
        return this.speed;
    }
}

class App
{
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 13;

    constructor()
    {
        
        this.#GetPosition();
        this.#GetLocalStorage();
        form.addEventListener("submit", event =>
        {
            event.preventDefault();
            this.#NewWorkout();
        });

        inputType.addEventListener("change", event =>
        {
            event.preventDefault();
            this.#ToggleWorkout();
        });

        containerWorkouts.addEventListener("click", this.#MoveToPopUp.bind(this));
    }

    #GetPosition()
    {
        if(navigator.geolocation)
        {
            navigator.geolocation.getCurrentPosition(this.#LoadMap.bind(this), () => alert("Could not get your position!"));
        }
    }

    #LoadMap(_position)
    {
        const latitude = _position.coords.latitude;
        const longitude = _position.coords.longitude;
        const coords = [latitude, longitude];
        //const mapsPosition = `https://www.google.com.mx/maps/@${latitude},${longitude}`;

        this.#map = L.map('map').setView(coords, this.#mapZoom);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
         .addTo(this.#map);

        this.#map.on("click", this.#ShowForm.bind(this));

        this.#workouts.forEach(_workout => 
            {
                this.#RenderWorkOutMarker(_workout);
            });
    }

    #ShowForm(_mapEvent)
    {
        this.#mapEvent = _mapEvent;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    #HideForm()
    {
        inputCadence.value = "";
        inputDistance.value = "";
        inputDuration.value = "";
        inputElevation.value = "";

        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => form.style.display = "grid", 1000);
    }

    #ToggleWorkout()
    {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    #NewWorkout()
    {
        const ValidInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const AllPositive = (...inputs) => inputs.every(input => input > 0);

        //Get data from form

        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
        
        switch(type)
        {
            case "running":
                const cadence = Number(inputCadence.value);
                if(!ValidInputs(distance, duration, cadence) || 
                   !AllPositive(distance, duration, cadence))
                {
                    return alert("Inputs have to be positive numbers!");
                }
                workout = new Running([lat, lng], distance, duration, cadence);
            break;

            case "cycling":
                const elevationGain = Number(inputElevation.value); 
                if(!ValidInputs(distance, duration, elevationGain) || 
                   !AllPositive(distance, duration))
                {
                    return alert("Inputs have to be positive numbers!");
                }
                workout = new Cycling([lat, lng], distance, duration, elevationGain);
            break;

            default:
                return console.log("That workout is not available");
        }

        this.#workouts.push(workout);
        this.#RenderWorkOutMarker(workout);
        this.#RenderWorkOut(workout);
        this.#HideForm();
        this.#SetLocalStorage();
    }

    #RenderWorkOutMarker(_workout)
    {
        const markerOptions =
        {
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${_workout.type}-popup`,
        }
     
        L.marker(_workout.coords)
            .addTo(this.#map)
            .bindPopup(L.popup(markerOptions))
            .setPopupContent(`${_workout.description}`)
            .openPopup();
    }

    #RenderWorkOut(_workout)
    {
        let HTML =
        `
        <li class="workout workout--${_workout.type}" data-id="${_workout.id}">
          <h2 class="workout__title">${_workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${_workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
            <span class="workout__value">${_workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${_workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if(_workout.type === "running")
        {
            HTML += 
            `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${_workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${_workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            `;
        }

        if(_workout.type === "cycling")
        {
            HTML +=
            `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${_workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${_workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            `;
        }

        form.insertAdjacentHTML("afterend",HTML);
    }

    #MoveToPopUp(event)
    {
        const workoutElement = event.target.closest(".workout");

        if(!workoutElement) return;

        const workout = this.#workouts.find(_workout => _workout.id == workoutElement.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoom);
    }

    #SetLocalStorage()
    {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    #GetLocalStorage()
    {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(_workout => 
        {
            this.#RenderWorkOut(_workout);
        });
    }

    ResetData()
    {
        localStorage.removeItem("workouts");
        location.reload();
    }
}

const app = new App();