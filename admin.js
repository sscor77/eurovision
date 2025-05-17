import { countriesData, TOTAL_USERS } from './countries.js';
import { playSound } from './utils.js';

const SOUND_CONFIRM = '/confirm.mp3'; 

document.addEventListener('DOMContentLoaded', () => {
    renderAdminPanel();
    setupAdminSubmitButton();
    loadAdminResults(); 
    calculateAndDisplayWinner(); 
});

function renderAdminPanel() {
    const adminCountryListDiv = document.getElementById('admin-country-list');
    if (!adminCountryListDiv) return;

    countriesData.forEach(country => {
        adminCountryListDiv.appendChild(createAdminCountryItem(country));
    });
    updateDisabledStatesForAdminPanel(); 
}

function createAdminCountryItem(country) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'country-item';

    const flagImg = document.createElement('img');
    flagImg.src = country.flag; 
    flagImg.alt = `Bandera de ${country.name}`;
    flagImg.className = 'flag';
    itemDiv.appendChild(flagImg);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${country.name} - ${country.artist} - "${country.song}"`;
    itemDiv.appendChild(nameSpan);

    const rankSelect = document.createElement('select');
    rankSelect.className = 'rank-select';
    rankSelect.dataset.countryId = country.id; 

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Puesto Final --";
    rankSelect.appendChild(defaultOption);

    for (let j = 1; j <= countriesData.length; j++) {
        const option = document.createElement('option');
        option.value = j;
        option.textContent = j;
        rankSelect.appendChild(option);
    }
    rankSelect.addEventListener('change', updateDisabledStatesForAdminPanel); 
    itemDiv.appendChild(rankSelect);
    return itemDiv;
}

function updateDisabledStatesForAdminPanel() {
    const adminPanel = document.getElementById('admin-country-list');
    if (!adminPanel) return;

    const allSelects = adminPanel.querySelectorAll('.rank-select');
    const usedRanks = new Set();

    allSelects.forEach(select => {
        if (select.value) {
            usedRanks.add(select.value);
        }
    });

    allSelects.forEach(select => {
        const currentSelectedValueInThisDropdown = select.value;
        for (let option of select.options) {
            option.style.color = ''; 
            option.disabled = false; 

            if (option.value === "") { 
                continue;
            }
            
            if (usedRanks.has(option.value)) {
                option.style.color = 'red';
                if (option.value !== currentSelectedValueInThisDropdown) {
                    option.disabled = true;
                }
            }
        }
    });
}

function validateAdminResults(results) {
    const assignedRanks = Object.values(results).map(rank => parseInt(rank, 10)).filter(rank => !isNaN(rank));
    if (assignedRanks.length !== countriesData.length) {
        return `Debes asignar un puesto a los ${countriesData.length} países.`;
    }
    const uniqueRanks = new Set(assignedRanks);
    if (uniqueRanks.size !== countriesData.length) {
        return "Cada puesto (1-26) debe ser asignado una sola vez.";
    }
     for (let i = 1; i <= countriesData.length; i++) {
        if (!uniqueRanks.has(i)) {
            return `El puesto ${i} no ha sido asignado. Todos los puestos del 1 al ${countriesData.length} deben ser usados.`;
        }
    }
    return null; 
}

function setupAdminSubmitButton() {
    const submitButton = document.getElementById('submit-admin-results');
    const adminMessageP = document.getElementById('admin-message');

    submitButton.addEventListener('click', () => {
        const results = {};
        document.querySelectorAll('#admin-country-list .rank-select').forEach(select => {
            if (select.value) { 
                results[select.dataset.countryId] = parseInt(select.value, 10);
            }
        });

        const validationError = validateAdminResults(results);
        if (validationError) {
            adminMessageP.textContent = validationError;
            adminMessageP.className = 'message error';
            return;
        }

        localStorage.setItem('eurovisionAdminResults', JSON.stringify(results));
        adminMessageP.textContent = 'Resultados oficiales guardados. Calculando ganador...';
        adminMessageP.className = 'message success';
        playSound(SOUND_CONFIRM);
        calculateAndDisplayWinner();
    });
}

function loadAdminResults() {
    const savedResults = localStorage.getItem('eurovisionAdminResults');
    if (savedResults) {
        const results = JSON.parse(savedResults);
        Object.entries(results).forEach(([countryId, rank]) => {
            const select = document.querySelector(`#admin-country-list .rank-select[data-country-id="${countryId}"]`);
            if (select) {
                select.value = rank;
            }
        });
    }
    updateDisabledStatesForAdminPanel(); 
}

function calculateAndDisplayWinner() {
    const adminResultsString = localStorage.getItem('eurovisionAdminResults');
    if (!adminResultsString) {
        document.getElementById('winner-display').innerHTML = '<p>El administrador aún no ha introducido los resultados finales.</p>';
        return;
    }
    const adminResults = JSON.parse(adminResultsString);

    const userScores = [];
    for (let i = 1; i <= TOTAL_USERS; i++) { 
        const userId = `user${i}`;
        const userVotesString = localStorage.getItem(`eurovisionUserVotes_${userId}`);
        if (!userVotesString) {
            userScores.push({ user: `Usuario ${i}`, score: 0, status: 'No votó', matches: [] });
            continue;
        }
        const userVotes = JSON.parse(userVotesString);
        let score = 0;
        let matchedDetails = [];
        Object.entries(userVotes).forEach(([countryId, userRank]) => {
            if (adminResults[countryId] && userRank === adminResults[countryId]) {
                score++;
                const country = countriesData.find(c => c.id === countryId);
                if (country) {
                    matchedDetails.push(`${country.name} (Puesto ${userRank})`);
                }
            }
        });
        userScores.push({ user: `Usuario ${i}`, score: score, status: 'OK', matches: matchedDetails });
    }

    if (userScores.length === 0) {
        document.getElementById('winner-display').innerHTML = '<p>No hay votos de usuarios para calcular resultados.</p>';
        return;
    }

    userScores.sort((a, b) => b.score - a.score);

    const winnerDisplay = document.getElementById('winner-display');
    let html = '<h3>Clasificación de Usuarios:</h3><ul>';
    const maxScore = userScores.length > 0 ? userScores[0].score : 0;
    
    userScores.forEach(entry => {
        let statusText = entry.status === 'No votó' ? ` (${entry.status})` : '';
        let winnerClass = (entry.score === maxScore && entry.status !== 'No votó' && maxScore > 0) ? ' class="winner"' : '';
        html += `<li${winnerClass}>${entry.user}: ${entry.score} coincidencia${entry.score !== 1 ? 's' : ''}${statusText}`;
        
        if (entry.matches && entry.matches.length > 0) {
            html += '<ul>';
            entry.matches.forEach(matchDetail => {
                html += `<li>${matchDetail}</li>`;
            });
            html += '</ul>';
        }
        html += `</li>`;
    });
    html += '</ul>';

    if (maxScore === 0 && userScores.every(u => u.status === 'No votó' || u.score === 0)) {
        html += "<p>Nadie tuvo coincidencias o no hay votos válidos de usuarios.</p>";
    } else if (maxScore > 0) {
        const winners = userScores.filter(u => u.score === maxScore && u.status !== 'No votó').map(u => u.user);
        if (winners.length > 0) {
            html += `<p><strong>Ganador(es): ${winners.join(', ')} con ${maxScore} coincidencia${maxScore !== 1 ? 's' : ''}!</strong></p>`;
        } else { 
            html += "<p>No se encontraron ganadores claros a pesar de haber coincidencias.</p>";
        }
    }

    winnerDisplay.innerHTML = html;
}