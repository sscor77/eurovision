import { countries, ADMIN_PASSWORD, TOTAL_RANKS } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const userName = params.get('user');

    const userTitle = document.getElementById('user-title');
    const countriesListDiv = document.getElementById('countries-list');
    const saveButton = document.getElementById('save-votes');
    const resetButton = document.getElementById('reset-votes');
    const messageArea = document.getElementById('message-area');

    if (!userName) {
        document.body.innerHTML = '<p>Error: Usuario no especificado. Vuelve al <a href="index.html">inicio</a>.</p>';
        return;
    }

    userTitle.textContent += userName;
    let userVotes = loadVotes(userName);
    let votingLockedStatus = false; 

    function updateVotingLockStatusAndUI() {
        votingLockedStatus = localStorage.getItem('voting_locked') === 'true';
        
        if (votingLockedStatus) {
            messageArea.textContent = 'La votación ha sido cerrada por el administrador. No se pueden realizar más cambios.';
            messageArea.className = 'message info'; 
            if (saveButton) saveButton.disabled = true;
            if (resetButton) resetButton.disabled = true;
        } else {
            if (messageArea.textContent === 'La votación ha sido cerrada por el administrador. No se pueden realizar más cambios.') {
                 messageArea.textContent = '';
            }
            messageArea.className = 'message'; 
            if (saveButton) saveButton.disabled = false;
            if (resetButton) resetButton.disabled = false;
        }
        renderCountries(); 
    }

    function loadVotes(user) {
        const votes = localStorage.getItem(`votes_${user}`);
        return votes ? JSON.parse(votes) : {};
    }

    function saveVotes(user, votes) {
        localStorage.setItem(`votes_${user}`, JSON.stringify(votes));
    }

    function renderCountries() {
        countriesListDiv.innerHTML = '';
        const assignedRanks = Object.values(userVotes).map(rank => parseInt(rank)).filter(rank => !isNaN(rank));

        countries.forEach(country => {
            const countryDiv = document.createElement('div');
            countryDiv.classList.add('country-item');

            const flagImg = document.createElement('img');
            flagImg.src = country.flag;
            flagImg.alt = `Bandera de ${country.name}`;
            flagImg.classList.add('flag');

            const infoDiv = document.createElement('div');
            infoDiv.classList.add('country-info');
            infoDiv.innerHTML = `<p><strong>${country.name}</strong></p><p>${country.artist} – ${country.song}</p>`;

            const selectRank = document.createElement('select');
            selectRank.classList.add('rank-select');
            selectRank.dataset.countryId = country.id;

            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Elige puesto";
            selectRank.appendChild(defaultOption);

            const currentRankForCountry = userVotes[country.id] ? parseInt(userVotes[country.id]) : null;

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

            if (votingLockedStatus) { 
                selectRank.disabled = true;
            }

            selectRank.addEventListener('change', (event) => {
                if (votingLockedStatus) return; 

                const selectedCountryId = event.target.dataset.countryId;
                const newRank = event.target.value ? parseInt(event.target.value) : null;

                for (const cId in userVotes) {
                    if (userVotes[cId] === newRank && cId !== selectedCountryId) {
                        userVotes[cId] = null; 
                    }
                }
                
                if (newRank !== null) {
                    userVotes[selectedCountryId] = newRank;
                } else {
                    delete userVotes[selectedCountryId]; 
                }
                
                renderCountries(); 
            });

            countryDiv.appendChild(flagImg);
            countryDiv.appendChild(infoDiv);
            countryDiv.appendChild(selectRank);
            countriesListDiv.appendChild(countryDiv);
        });
    }
    
    saveButton.addEventListener('click', () => {
        if (votingLockedStatus) {
             messageArea.textContent = 'La votación está cerrada. No se pueden guardar cambios.';
             messageArea.className = 'message error'; 
             return;
        }
        const assignedRanks = Object.values(userVotes).filter(rank => rank !== null);
        const uniqueAssignedRanks = new Set(assignedRanks);

        if (Object.keys(userVotes).length < TOTAL_RANKS || assignedRanks.length < TOTAL_RANKS || uniqueAssignedRanks.size < TOTAL_RANKS) {
             messageArea.textContent = 'Debes asignar un puesto único a cada país.';
             messageArea.className = 'message error';
             return;
        }

        saveVotes(userName, userVotes);
        messageArea.textContent = '¡Puntuaciones guardadas con éxito!';
        messageArea.className = 'message success';
        setTimeout(() => {
            if (messageArea.textContent === '¡Puntuaciones guardadas con éxito!') { 
                 messageArea.textContent = '';
            }
        }, 3000);
    });

    resetButton.addEventListener('click', () => {
        if (votingLockedStatus) {
            messageArea.textContent = 'La votación está cerrada. No se pueden resetear las puntuaciones.';
            messageArea.className = 'message error'; 
            return;
        }
        const password = prompt('Introduce la contraseña para resetear las puntuaciones:');
        if (password === ADMIN_PASSWORD) {
            userVotes = {};
            saveVotes(userName, userVotes);
            renderCountries();
            messageArea.textContent = 'Puntuaciones reseteadas.';
            messageArea.className = 'message success';
            setTimeout(() => {
                if (messageArea.textContent === 'Puntuaciones reseteadas.') {
                    messageArea.textContent = '';
                }
            }, 3000);
        } else if (password !== null) {
            messageArea.textContent = 'Contraseña incorrecta para resetear.';
            messageArea.className = 'message error';
             setTimeout(() => { 
                if (messageArea.textContent === 'Contraseña incorrecta para resetear.') {
                    messageArea.textContent = '';
                }
            }, 3000);
        }
    });

    updateVotingLockStatusAndUI();

    window.addEventListener('storage', (event) => {
        if (event.key === 'voting_locked') {
            updateVotingLockStatusAndUI();
        }
    });
});
