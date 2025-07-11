// Inicijalizacija mape
const map = L.map('map').setView([45.1, 15.2], 7); // Središte Hrvatske

// Dodavanje osnovne tile mape
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Definiraj različite ikone
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

// Funkcija za dodavanje markera
function loadMarkers(filteredData) {
  // Očisti mapu prije nego ponovo dodamo markere
  map.eachLayer(function(layer) {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Dodaj markere prema filtriranim podacima
  filteredData.forEach(item => {
    // Žuti marker za grad
    L.marker([item.lat, item.lng], { icon: yellowIcon })
      .addTo(map)
      .bindPopup(
        `<b>Grad:</b> ${item.grad}<br><b>Vrste:</b><br>${vrstePoGraduPopup(item.grad)}`
      );

    // Narančasti markeri za lokacije
    if (item.lokacije) {
      item.lokacije.forEach(lok => {
        L.marker([lok.lat, lok.lng], { icon: orangeIcon })
          .addTo(map)
          .bindPopup(`<b>Vrsta:</b> ${item.vrsta} <br> <b>Lokacija:</b> ${lok.ime} <br> <b>Grad:</b> ${item.grad}`);

        // Crveni markeri za detaljne lokacije
        if (lok.detalji) {
          lok.detalji.forEach(det => {
            L.marker([det.lat, det.lng], { icon: redIcon })
              .addTo(map)
              .bindPopup(`<b>Vrsta:</b> ${item.vrsta} <br> <b>Detaljna lokacija:</b> ${det.ime} <br> <b>Grad:</b> ${item.grad}`);
          });
        }
      });
    }
  });
}

let gradoviDict = {};

Promise.all([
  fetch('podaci/BrackoCro.json').then(res => res.json()),
  fetch('podaci/gradovi.json').then(res => res.json())
]).then(([data, gradovi]) => {
  gradoviDict = {};
  gradovi.forEach(g => {
    if (g.naziv) gradoviDict[g.naziv] = { lat: g.lat, lng: g.lng };
    if (g.grad) gradoviDict[g.grad] = { lat: g.lat, lng: g.lng };
  });

  window.antData = flattenAntDataBracko(data);
  window.hierAntData = data; // Za kompatibilnost
  generateSpeciesListBracko(data);
  loadMarkers([]); // Ne prikazuj markere na početku
  provjeriGradove(window.hierAntData, gradoviDict); // Provjeri gradove nakon učitavanja podataka
});

// Nova flatten funkcija koja koristi gradoviDict
function flattenAntData(data) {
  const flat = [];
  data.forEach(potporodica => {
    potporodica.vrste?.forEach(vrstaObj => {
      const vrsta = vrstaObj.vrsta;
      vrstaObj.lokacije?.forEach(lok => {
        const grad = lok.grad;
        if (gradoviDict[grad]) {
          flat.push({
            vrsta: vrsta,
            grad: grad,
            lat: gradoviDict[grad].lat,
            lng: gradoviDict[grad].lng
          });
        }
      });
    });
  });
  return flat;
}

function flattenAntDataBracko(data) {
  const flat = [];
  data.forEach(obj => {
    if (!obj.lokacije) return;
    obj.lokacije.forEach(lok => {
      // Probaj pronaći koordinate
      const grad = lok;
      if (gradoviDict[grad]) {
        flat.push({
          vrsta: obj.vrsta,
          rod: obj.rod,
          potporodica: obj.potporodica,
          grad: grad,
          lat: gradoviDict[grad].lat,
          lng: gradoviDict[grad].lng
        });
      }
    });
  });
  return flat;
}

// Funkcija za filtriranje (koristi window.antData)
function filterData() {
  const checkedRadio = document.querySelector('#species-list input[type="radio"]:checked');
  if (!checkedRadio || checkedRadio.id === "none") {
    loadMarkers([]); // Nema odabrane vrste, makni sve markere
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

// Funkcija za dinamičko generiranje hijerarhijskog izbornika vrsta
function generateHierarchicalSpeciesList(data) {
  const container = document.getElementById('species-list');
  container.innerHTML = '';

  // Dodaj opciju za maknuti sve markere
  const noneDiv = document.createElement('div');
  noneDiv.innerHTML = `
    <input type="radio" name="species" id="none" onchange="filterData()" checked>
    <label for="none"><i>Makni sve markere</i></label>
  `;
  container.appendChild(noneDiv);

  // Grupiraj po potporodici
  const potporodice = {};
  data.forEach(obj => {
    if (!potporodica[obj.potporodica]) potporodica[obj.potporodica] = [];
    potporodica[obj.potporodica].push(obj);
  });

  Object.entries(potporodice).forEach(([potporodica, rodovi]) => {
    const potDiv = document.createElement('div');
    potDiv.className = 'potporodica-block';
    const potTitle = document.createElement('div');
    potTitle.className = 'potporodica-title';
    // Dodaj > ispred naziva
    const potArrow = document.createElement('span');
    potArrow.textContent = '►';
    potArrow.style.marginRight = '6px';
    potTitle.appendChild(potArrow);
    potTitle.appendChild(document.createTextNode(potporodica));
    potDiv.appendChild(potTitle);

    let potOpen = false;

    rodovi.forEach(rodObj => {
      const rodDiv = document.createElement('div');
      rodDiv.className = 'rod-block';
      const rodTitle = document.createElement('div');
      rodTitle.className = 'rod-title';
      // Dodaj > ispred naziva roda
      const rodArrow = document.createElement('span');
      rodArrow.textContent = '►';
      rodArrow.style.marginRight = '6px';
      rodTitle.appendChild(rodArrow);
      rodTitle.appendChild(document.createTextNode(rodObj.rod));
      rodDiv.appendChild(rodTitle);

      // Vrste (radio gumbi)
      const vrsteUl = document.createElement('ul');
      rodObj.vrste.forEach(vrstaObj => {
        const li = document.createElement('li');
        li.innerHTML = `
          <input type="radio" name="species" id="${vrstaObj.vrsta}" onchange="filterData()">
          <label for="${vrstaObj.vrsta}">${vrstaObj.vrsta}</label>
        `;
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
          // Zatvori sve vrsteUl u ovom potDiv
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

    // Otvaranje/zatvaranje potporodica
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
        // Zatvori sve ostale potporodice
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
}

// CSS dio
const style = document.createElement('style');
style.textContent = `
  .potporodica-title, .rod-title {
    user-select: none;
  }
  .potporodica-title span, .rod-title span {
    font-weight: bold;
    display: inline-block;
    width: 1em;
  }
`;
document.head.appendChild(style);

// Nova funkcija za generiranje popisa vrsta
function generateSpeciesListBracko(data) {
  const container = document.getElementById('species-list');
  container.innerHTML = '';

  // Opcija za maknuti sve markere
  const noneDiv = document.createElement('div');
  noneDiv.innerHTML = `
    <input type="radio" name="species" id="none" onchange="filterData()" checked>
    <label for="none"><i>Makni sve markere</i></label>
  `;
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
        li.innerHTML = `
          <input type="radio" name="species" id="${vrstaObj.vrsta}" onchange="filterData()">
          <label for="${vrstaObj.vrsta}">${vrstaObj.vrsta}</label>
        `;
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
          // Zatvori sve vrsteUl u ovom potDiv
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

    // Otvaranje/zatvaranje potporodica
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
        // Zatvori sve ostale potporodice
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
}

// CSS dio
const style = document.createElement('style');
style.textContent = `
  .potporodica-title, .rod-title {
    user-select: none;
  }
  .potporodica-title span, .rod-title span {
    font-weight: bold;
    display: inline-block;
    width: 1em;
  }
`;
document.head.appendChild(style);

// Nova funkcija za generiranje popisa vrsta
function generateSpeciesListBracko(data) {
  const container = document.getElementById('species-list');
  container.innerHTML = '';

  // Opcija za maknuti sve markere
  const noneDiv = document.createElement('div');
  noneDiv.innerHTML = `
    <input type="radio" name="species" id="none" onchange="filterData()" checked>
    <label for="none"><i>Makni sve markere</i></label>
  `;
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
        li.innerHTML = `
          <input type="radio" name="species" id="${vrstaObj.vrsta}" onchange="filterData()">
          <label for="${vrstaObj.vrsta}">${vrstaObj.vrsta}</label>
        `;
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
          // Zatvori sve vrsteUl u ovom potDiv
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

    // Otvaranje/zatvaranje potporodica
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
        // Zatvori sve ostale potporodice
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
}

// --- Nova tražilica gradova s padajućim popisom ---
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
  if (vrste.length === 0) return "<i style='font-size:12px'>Nema podataka o vrstama za ovaj grad.</i>";
  return `
    <div class="popup-vrste-title">Vrste (${vrste.length}):</div>
    <ul class="popup-vrste-list">${vrste.map(v => `<li>${v}</li>`).join('')}</ul>
  `;
}

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

function exportMissingCitiesToTxt(data, gradoviDict) {
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
    alert("Svi gradovi postoje u gradovi.json!");
    return;
  }
  const text = Array.from(nedostaju).sort().join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nedostajuci_gradovi.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function vrstePoGradu(grad) {
  const vrste = [];
  window.hierAntData.forEach(obj => {
    if (obj.lokacije && obj.lokacije.includes(grad)) {
      vrste.push({
        potporodica: obj.potporodica,
        rod: obj.rod,
        vrsta: obj.vrsta
      });
    }
  });
  if (vrste.length === 0) {
    console.log(`Nema vrsta za grad: ${grad}`);
  } else {
    console.log(`Vrste za grad ${grad}:`);
    vrste.forEach(v => {
      console.log(`${v.potporodica} | ${v.rod} | ${v.vrsta}`);
    });
  }
}

// Dodano za pretraživanje gradova
document.getElementById('city-search').addEventListener('input', function(e) {
  const query = e.target.value.trim().toLowerCase();
  if (!query) return;
  // Pronađi grad u gradoviDict
  const grad = Object.keys(gradoviDict).find(g =>
    g.toLowerCase().includes(query)
  );
  if (grad) {
    const { lat, lng } = gradoviDict[grad];
    map.setView([lat, lng], 11);
    // Prikaži popup s vrstama
    const popup = L.popup()
      .setLatLng([lat, lng])
      .setContent(`<b>Grad:</b> ${grad}<br><b>Vrste:</b><br>${vrstePoGraduPopup(grad)}`);
    popup.openOn(map);
  }
});
