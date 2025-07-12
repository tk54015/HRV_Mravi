// Inicijalizacija mape
const map = L.map('map').setView([45.1, 15.2], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Ikone
const yellowIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const orangeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

let gradoviDict = {};
let lokalitetiDict = {};
let currentVrste = [];
let currentLokaliteti = [];
let isZGMrav = false;
let lastCheckedSpeciesId = 'showAll'; // default je "Prikaži sve lokalitete"

// Učitavanje baze prema izboru
function ucitajSve(dbFile) {
  fetch('podaci/' + dbFile)
    .then(res => res.json())
    .then(data => {
      if (data.vrste && data.lokaliteti) {
        isZGMrav = true;
        currentVrste = data.vrste;
        currentLokaliteti = data.lokaliteti;
        lokalitetiDict = {};
        data.lokaliteti.forEach(lok => {
          lokalitetiDict[lok.id] = { lat: lok.lat, lng: lok.lng, naziv: lok.naziv };
        });
        gradoviDict = lokalitetiDict;
        window.antData = flattenAntDataBracko(data.vrste, lokalitetiDict);
        window.hierAntData = data.vrste;
        generateSpeciesListBracko(data.vrste);
        // Automatski aktiviraj odgovarajući gumb
        if (lastCheckedSpeciesId === 'none') {
          loadMarkers([]);
        } else {
          loadMarkers(); // showAll ili neka vrsta
        }
      } else {
        isZGMrav = false;
        currentVrste = data;
        fetch('podaci/gradovi.json')
          .then(res => res.json())
          .then(gradovi => {
            gradoviDict = {};
            gradovi.forEach(g => {
              if (g.naziv) gradoviDict[g.naziv] = { lat: g.lat, lng: g.lng };
              if (g.grad) gradoviDict[g.grad] = { lat: g.lat, lng: g.lng };
            });
            window.antData = flattenAntDataBracko(data, gradoviDict);
            window.hierAntData = data;
            generateSpeciesListBracko(data);
            // Automatski aktiviraj odgovarajući gumb
            if (lastCheckedSpeciesId === 'none') {
              loadMarkers([]);
            } else {
              loadMarkers();
            }
          });
      }
    });
}

// Flatten funkcija
function flattenAntDataBracko(data, dict) {
  const flat = [];
  data.forEach(obj => {
    if (!obj.lokacije) return;
    obj.lokacije.forEach(lok => {
      if (dict[lok]) {
        flat.push({
          vrsta: obj.vrsta,
          rod: obj.rod,
          potporodica: obj.potporodica,
          grad: lok,
          lat: dict[lok].lat,
          lng: dict[lok].lng
        });
      }
    });
  });
  return flat;
}

// Prvo učitaj default bazu
ucitajSve(document.getElementById('db-select').value);

// Promjena baze podataka
document.getElementById('db-select').addEventListener('change', function() {
  ucitajSve(this.value);
});

// Funkcija za dodavanje markera
function loadMarkers(filteredData) {
  map.eachLayer(function(layer) {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  // Ako je filtrirano, prikazuj samo odabrane
  if (filteredData && filteredData.length > 0) {
    filteredData.forEach(item => {
      L.marker([item.lat, item.lng], { icon: yellowIcon })
        .addTo(map)
        .bindPopup(
          `<b>Lokalitet:</b> ${gradoviDict[item.grad]?.naziv || item.grad}<br>
           <b>Vrsta:</b> ${item.vrsta}`
        );
    });
    return;
  }

  // Ako je filteredData prazno (Makni sve markere), NE prikazuj ništa!
  if (filteredData && filteredData.length === 0) {
    return;
  }

  // Ako nije filtrirano ili je pozvano bez argumenta, prikazuj sve lokalitete
  const dict = isZGMrav ? lokalitetiDict : gradoviDict;
  Object.entries(dict).forEach(([id, lok]) => {
    // Broj vrsta za lokalitet
    const vrste = window.antData.filter(item => item.grad === id);
    // Sortiraj abecedno po hrvatskom
    const vrsteSorted = [...vrste].sort((a, b) => a.vrsta.localeCompare(b.vrsta, 'hr'));
    const popupHtml = `
      <b>Lokalitet:</b> ${lok.naziv || id}<br>
      <b>Broj vrsta:</b> ${vrsteSorted.length}<br>
      ${vrsteSorted.length > 0 ? `<ul class="popup-vrste-list">${vrsteSorted.map(v => `<li>${v.vrsta}</li>`).join('')}</ul>` : "<i style='font-size:12px'>Nema podataka o vrstama za ovaj lokalitet.</i>"}
    `;
    L.marker([lok.lat, lok.lng], { icon: yellowIcon })
      .addTo(map)
      .bindPopup(popupHtml);
  });
}

// Funkcija za filtriranje
function filterData() {
  const checkedRadio = document.querySelector('#species-list input[type="radio"]:checked');
  if (checkedRadio) lastCheckedSpeciesId = checkedRadio.id;
  if (!checkedRadio || checkedRadio.id === "none") {
    loadMarkers([]);
    return;
  }
  if (checkedRadio.id === "showAll") {
    loadMarkers();
    return;
  }
  const filteredData = window.antData.filter(item => item.vrsta === checkedRadio.id);
  loadMarkers(filteredData);
}

// Funkcija za otvaranje i zatvaranje sidebar-a
document.getElementById('toggle-button').addEventListener('click', function() {
  const speciesList = document.getElementById('species-list');
  speciesList.classList.toggle('hidden');
  const buttonText = speciesList.classList.contains('hidden') ? 'Prikaži vrste' : 'Sakrij vrste';
  document.getElementById('toggle-button').innerText = buttonText;
});

// Funkcija za generiranje popisa vrsta (po potporodici i rodu)
function generateSpeciesListBracko(data) {
  const container = document.getElementById('species-list');
  container.innerHTML = '';

  // Opcija za prikaz svih lokaliteta
  const allDiv = document.createElement('div');
  const allInput = document.createElement('input');
  allInput.type = 'radio';
  allInput.name = 'species';
  allInput.id = 'showAll';
  const allLabel = document.createElement('label');
  allLabel.htmlFor = 'showAll';
  allLabel.innerHTML = '<i>Prikaži sve lokalitete</i>';
  // allLabel.style.display = 'inline'; // UKLONJENO
  allLabel.style.color = '#222';
  allLabel.style.fontSize = '15px';
  allLabel.style.background = '#fff';
  allLabel.style.position = 'relative';
  allLabel.style.zIndex = '1000';
  allDiv.appendChild(allInput);
  allDiv.appendChild(allLabel);
  container.appendChild(allDiv);

  // Opcija za maknuti sve markere
  const noneDiv = document.createElement('div');
  const noneInput = document.createElement('input');
  noneInput.type = 'radio';
  noneInput.name = 'species';
  noneInput.id = 'none';
  const noneLabel = document.createElement('label');
  noneLabel.htmlFor = 'none';
  noneLabel.innerHTML = '<i>Makni sve markere</i>';
  noneDiv.appendChild(noneInput);
  noneDiv.appendChild(noneLabel);
  container.appendChild(noneDiv);

  // Grupiraj po potporodici i rodu
  const potporodice = {};
  data.forEach(obj => {
    if (!potporodice[obj.potporodica]) potporodice[obj.potporodica] = {};
    if (!potporodice[obj.potporodica][obj.rod]) potporodice[obj.potporodica][obj.rod] = [];
    potporodice[obj.potporodica][obj.rod].push(obj);
  });

  Object.entries(potporodice).forEach(([potporodica, rodovi]) => {
    const potDiv = document.createElement('div');
    potDiv.className = 'potporodica-block';
    const potTitle = document.createElement('div');
    potTitle.className = 'potporodica-title';
    const potArrow = document.createElement('span');
    potArrow.textContent = '►';
    potArrow.style.marginRight = '6px';
    potTitle.appendChild(potArrow);
    potTitle.appendChild(document.createTextNode(potporodica));
    potDiv.appendChild(potTitle);

    let potOpen = false;

    Object.entries(rodovi).forEach(([rod, vrste]) => {
      const rodDiv = document.createElement('div');
      rodDiv.className = 'rod-block';
      const rodTitle = document.createElement('div');
      rodTitle.className = 'rod-title';
      const rodArrow = document.createElement('span');
      rodArrow.textContent = '►';
      rodArrow.style.marginRight = '6px';
      rodTitle.appendChild(rodArrow);
      rodTitle.appendChild(document.createTextNode(rod));
      rodDiv.appendChild(rodTitle);

      // Vrste (radio gumbi)
      const vrsteUl = document.createElement('ul');
      vrste.forEach(vrstaObj => {
        const li = document.createElement('li');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'species';
        radio.id = vrstaObj.vrsta;
        const label = document.createElement('label');
        label.htmlFor = vrstaObj.vrsta;
        label.textContent = vrstaObj.vrsta;
        li.appendChild(radio);
        li.appendChild(label);
        vrsteUl.appendChild(li);
      });
      rodDiv.appendChild(vrsteUl);

      // Otvaranje/zatvaranje rodova
      vrsteUl.style.display = 'none';
      let rodOpen = false;
      rodTitle.style.cursor = 'pointer';
      rodTitle.onclick = () => {
        if (rodOpen) {
          vrsteUl.style.display = 'none';
          rodArrow.textContent = '►';
          rodOpen = false;
        } else {
          Array.from(rodDiv.parentNode.children).forEach(child => {
            if (child.querySelector && child.querySelector('ul')) {
              child.querySelector('ul').style.display = 'none';
              if (child.querySelector('.rod-title span')) {
                child.querySelector('.rod-title span').textContent = '►';
              }
              child.rodOpen = false;
            }
          });
          vrsteUl.style.display = 'block';
          rodArrow.textContent = '▼';
          rodOpen = true;
        }
      };

      potDiv.appendChild(rodDiv);
    });

    Array.from(potDiv.children).forEach((child, i) => {
      if (i > 0) child.style.display = 'none';
    });
    potTitle.style.cursor = 'pointer';
    potTitle.onclick = () => {
      if (potOpen) {
        Array.from(potDiv.children).forEach((child, i) => {
          if (i > 0) child.style.display = 'none';
        });
        potArrow.textContent = '►';
        potOpen = false;
      } else {
        Array.from(container.children).forEach(potDiv2 => {
          if (potDiv2 !== potDiv) {
            Array.from(potDiv2.children).forEach((child, i) => {
              if (i > 0) child.style.display = 'none';
            });
            if (potDiv2.querySelector('.potporodica-title span')) {
              potDiv2.querySelector('.potporodica-title span').textContent = '►';
            }
            potDiv2.potOpen = false;
          }
        });
        Array.from(potDiv.children).forEach((child, i) => {
          if (i > 0) child.style.display = 'block';
        });
        potArrow.textContent = '▼';
        potOpen = true;
      }
    };

    container.appendChild(potDiv);
  });

  container.querySelectorAll('input[type="radio"][name="species"]').forEach(radio => {
    radio.addEventListener('change', filterData);
    if (radio.id === lastCheckedSpeciesId) {
      radio.checked = true;
    }
  });
  // Ako nijedan nije checked, default na "showAll"
  if (!container.querySelector('input[type="radio"]:checked')) {
    container.querySelector('#showAll').checked = true;
    lastCheckedSpeciesId = 'showAll';
  }
  const noneLabelFix = container.querySelector('label[for="none"]');
  if (noneLabelFix) {
    noneLabelFix.innerHTML = '<i>Makni sve markere</i>';
    noneLabelFix.style.display = 'inline';
  }
}

// --- Tražilica gradova s padajućim popisom ---
const cityInput = document.getElementById('city-search');
const citySuggestions = document.getElementById('city-suggestions');

cityInput.addEventListener('input', function(e) {
  const query = e.target.value.trim().toLowerCase();
  citySuggestions.innerHTML = '';
  if (!query) {
    citySuggestions.classList.add('hidden');
    return;
  }
  // Pronađi gradove koji sadrže upit
  const gradovi = Object.keys(gradoviDict).filter(g =>
    g.toLowerCase().includes(query)
  );
  if (gradovi.length === 0) {
    citySuggestions.classList.add('hidden');
    return;
  }
  gradovi.forEach(grad => {
    const div = document.createElement('div');
    div.textContent = grad;
    div.onclick = () => {
      cityInput.value = grad;
      citySuggestions.classList.add('hidden');
      // Centriraj na grad i prikaži popup s vrstama
      const { lat, lng } = gradoviDict[grad];
      map.setView([lat, lng], 11);
      const popup = L.popup()
        .setLatLng([lat, lng])
        .setContent(`<b>Grad:</b> ${grad}<br>${vrstePoGraduPopup(grad)}`);
      popup.openOn(map);
    };
    citySuggestions.appendChild(div);
  });
  citySuggestions.classList.remove('hidden');
});

// Sakrij prijedloge kad klikneš izvan tražilice
document.addEventListener('click', function(e) {
  if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
    citySuggestions.classList.add('hidden');
  }
});

// --- Popup vrste: samo ime vrste, broj vrsta, manji font, scroll ---
function vrstePoGraduPopup(grad) {
  const vrste = [];
  window.hierAntData.forEach(obj => {
    if (obj.lokacije && obj.lokacije.includes(grad)) {
      vrste.push(obj.vrsta);
    }
  });
  // Sortiraj abecedno po hrvatskom
  vrste.sort((a, b) => a.localeCompare(b, 'hr'));
  if (vrste.length === 0) return "<i style='font-size:12px'>Nema podataka o vrstama za ovaj grad.</i>";
  return `
    <div class="popup-vrste-title">Vrste (${vrste.length}):</div>
    <ul class="popup-vrste-list">${vrste.map(v => `<li>${v}</li>`).join('')}</ul>
  `;
}

// --- Provjera gradova ---
function provjeriGradove(data, gradoviDict) {
  const sviGradovi = new Set(Object.keys(gradoviDict));
  const nedostaju = new Set();
  data.forEach(obj => {
    if (!obj.lokacije) return;
    obj.lokacije.forEach(lok => {
      if (!sviGradovi.has(lok)) {
        nedostaju.add(lok);
      }
    });
  });
  if (nedostaju.size === 0) {
    console.log("Svi gradovi iz BrackoCro.json postoje u gradovi.json!");
  } else {
    console.log("Nedostaju gradovi u gradovi.json:", Array.from(nedostaju));
    // Dodaj u HTML (opcionalno)
    const div = document.createElement('div');
    div.style.color = 'red';
    div.style.fontSize = '14px';
    div.innerHTML = "<b>Nedostaju gradovi u gradovi.json:</b><br>" + Array.from(nedostaju).join("<br>");
    document.body.appendChild(div);
  }
}

