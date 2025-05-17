import { countries, ADMIN_PASSWORD, TOTAL_RANKS, users as userNames } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const adminContentDiv = document.getElementById('admin-content');
    const officialRankingListDiv = document.getElementById('official-ranking-list');
    const saveRankingButton = document.getElementById('save-ranking');
    const resultsAreaDiv = document.getElementById('results-area');

    let officialRanking = loadOfficialRanking();

    function checkPassword() {
        const password = prompt('Introduce la contraseña de administrador:');
        if (password === ADMIN_PASSWORD) {
            adminContentDiv.style.display = 'block';
            renderOfficialRankingForm();
            displayResults(); // Display previous results if any
        } else {
            document.body.innerHTML = '<p>Contraseña incorrecta. Acceso denegado. Vuelve al <a href="index.html">inicio</a>.</p>';
        }
    }

    function loadOfficialRanking() {
        const ranking = localStorage.getItem('eurovision_official_ranking');
        return ranking ? JSON.parse(ranking) : {};
    }

    function saveOfficialRanking(ranking) {
        localStorage.setItem('eurovision_official_ranking', JSON.stringify(ranking));
    }
    
    function renderOfficialRankingForm() {
        officialRankingListDiv.innerHTML = '';
        const assignedRanks = Object.values(officialRanking).map(rank => parseInt(rank)).filter(rank => !isNaN(rank));

        countries.forEach(country => {
            const countryDiv = document.createElement('div');
            countryDiv.classList.add('country-item');

            const flagImg = document.createElement('img');
            flagImg.src = country.flag;
            flagImg.alt = `Bandera de ${country.name}`;
            flagImg.classList.add('flag');

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('country-info');
            infoDiv.innerHTML = `<p><strong>${country.name}</strong></p>`;

            const selectRank = document.createElement('select');
            selectRank.classList.add('rank-select');
            selectRank.dataset.countryId = country.id;

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Elige puesto oficial";
            selectRank.appendChild(defaultOption);

            const currentRankForCountry = officialRanking[country.id] ? parseInt(officialRanking[country.id]) : null;

            for (let i = 1; i <= TOTAL_RANKS; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Puesto ${i}`; 

                if (currentRankForCountry === i) {
                    option.selected = true;
                }

                if (assignedRanks.includes(i)) {
                    option.classList.add('option-used'); 
                    if (currentRankForCountry !== i) { 
                        option.disabled = true;
                        option.textContent += " (Usado)"; 
                    }
                }
                selectRank.appendChild(option);
            }
            
            if (currentRankForCountry) {
                selectRank.classList.add('voted');
            }

            selectRank.addEventListener('change', (event) => {
                const selectedCountryId = event.target.dataset.countryId;
                const newRank = event.target.value ? parseInt(event.target.value) : null;

                for (const cId in officialRanking) {
                    if (officialRanking[cId] === newRank && cId !== selectedCountryId) {
                        officialRanking[cId] = null;
                    }
                }
                
                if (newRank !== null) {
                    officialRanking[selectedCountryId] = newRank;
                } else {
                    delete officialRanking[selectedCountryId];
                }
                renderOfficialRankingForm(); 
            });

            countryDiv.appendChild(flagImg);
            countryDiv.appendChild(infoDiv);
            countryDiv.appendChild(selectRank);
            officialRankingListDiv.appendChild(countryDiv);
        });
    }

    saveRankingButton.addEventListener('click', () => {
        const assignedRanks = Object.values(officialRanking).filter(rank => rank !== null);
        const uniqueAssignedRanks = new Set(assignedRanks);

        if (Object.keys(officialRanking).length < TOTAL_RANKS || assignedRanks.length < TOTAL_RANKS || uniqueAssignedRanks.size < TOTAL_RANKS) {
             alert('Debes asignar un puesto único a cada país en el ranking oficial.');
             return;
        }
        saveOfficialRanking(officialRanking);
        alert('Ranking oficial guardado.');
        displayResults();
    });

    function getCountryNameById(countryId) {
        const country = countries.find(c => c.id === countryId);
        return country ? country.name : 'Desconocido';
    }

    function displayResults() {
        resultsAreaDiv.innerHTML = '';
        if (Object.keys(officialRanking).length < TOTAL_RANKS) {
            resultsAreaDiv.innerHTML = '<p>Aún no se ha guardado un ranking oficial completo.</p>';
            return;
        }

        let maxCoincidences = -1;
        let winners = [];
        const resultsList = document.createElement('ul');

        userNames.forEach(userName => {
            const userVotesStored = localStorage.getItem(`votes_${userName}`);
            if (!userVotesStored) {
                const li = document.createElement('li');
                li.textContent = `${userName}: No hay votos registrados.`;
                resultsList.appendChild(li);
                return;
            }
            
            const userVotes = JSON.parse(userVotesStored);
            let coincidencesCount = 0;
            let matchedCountriesDetails = [];

            for (const countryId in userVotes) {
                if (userVotes[countryId] !== null && officialRanking[countryId] !== undefined && 
                    parseInt(userVotes[countryId]) === parseInt(officialRanking[countryId])) {
                    coincidencesCount++;
                    matchedCountriesDetails.push(`${getCountryNameById(countryId)} (Puesto ${officialRanking[countryId]})`);
                }
            }
            
            const li = document.createElement('li');
            let detailsString = matchedCountriesDetails.length > 0 ? ` (${matchedCountriesDetails.join(', ')})` : '';
            li.innerHTML = `<strong>${userName}</strong>: ${coincidencesCount} coincidencia(s)${detailsString}`;
            resultsList.appendChild(li);

            if (coincidencesCount > maxCoincidences) {
                maxCoincidences = coincidencesCount;
                winners = [userName];
            } else if (coincidencesCount === maxCoincidences && maxCoincidences !== -1) { 
                winners.push(userName);
            }
        });
        resultsAreaDiv.appendChild(resultsList);

        if (winners.length > 0 && maxCoincidences > 0) { 
            const winnerP = document.createElement('p');
            winnerP.innerHTML = `<strong>Ganador(es): ${winners.join(', ')} con ${maxCoincidences} coincidencias!</strong>`;
            resultsAreaDiv.appendChild(winnerP);
        } else if (maxCoincidences === 0) {
             const noWinnerP = document.createElement('p');
            noWinnerP.innerHTML = '<strong>Nadie tuvo coincidencias.</strong>';
            resultsAreaDiv.appendChild(noWinnerP);
        }
    }
    checkPassword();
});
