import { countriesData, TOTAL_USERS, RESET_PASSWORD } from './countries.js';
import { playSound } from './utils.js';

const SOUND_CONFIRM = '/confirm.mp3';

document.addEventListener('DOMContentLoaded', () => {
    const userSelectionContainer = document.getElementById('user-links-container');
    const singleUserVotingPanelContainer = document.getElementById('single-user-voting-panel-container');
    const resetButton = document.getElementById('reset-scores-button');

    if (userSelectionContainer) { // We are on index.html
        renderUserNavigationLinks(userSelectionContainer);
        if (resetButton) {
            setupResetButton();
        }
    } else if (singleUserVotingPanelContainer) { // We are on user-vote.html
        const urlParams = new URLSearchParams(window.location.search);
        const userNumber = urlParams.get('user');
        if (userNumber && parseInt(userNumber) > 0 && parseInt(userNumber) <= TOTAL_USERS) {
            const userId = `user${userNumber}`;
            document.getElementById('user-page-title').textContent = `Votación Eurovisión - Usuario ${userNumber}`;
            renderSingleUserPanel(singleUserVotingPanelContainer, userId, userNumber);
        } else {
            singleUserVotingPanelContainer.innerHTML = '<p class="message error">Usuario no válido o no especificado.</p>';
        }
    }
});

function renderUserNavigationLinks(container) {
    for (let i = 1; i <= TOTAL_USERS; i++) {
        const link = document.createElement('a');
        link.href = `user-vote.html?user=${i}`;
        link.className = 'user-selection-link';
        link.textContent = `Votar como Usuario ${i}`;
        container.appendChild(link);
    }
}

function renderSingleUserPanel(container, userId, userNumber) {
    const panel = document.createElement('div');
    panel.className = 'user-voting-panel';
    panel.id = `${userId}-panel`;

    const title = document.createElement('h2');
    title.textContent = `Panel de Votación - Usuario ${userNumber}`;
    panel.appendChild(title);

    const countryListDiv = document.createElement('div');
    countryListDiv.className = 'country-list';
    countriesData.forEach(country => {
        countryListDiv.appendChild(createCountryItem(country, userId));
    });
    panel.appendChild(countryListDiv);

    const saveButton = document.createElement('button');
    saveButton.className = 'save-button';
    saveButton.dataset.user = userId;
    saveButton.textContent = `Guardar Votos Usuario ${userNumber}`;
    saveButton.addEventListener('click', () => saveUserVotes(userId));
    panel.appendChild(saveButton);

    const messageP = document.createElement('p');
    messageP.className = 'message';
    messageP.id = `${userId}-message`;
    panel.appendChild(messageP);

    container.appendChild(panel);
    loadUserVotes(userId); // This already calls updateDisabledStatesForUser
}

function createCountryItem(country, userId) {
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
    rankSelect.id = `${userId}-rank-${country.id}`;

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "-- Puesto --";
    rankSelect.appendChild(defaultOption);

    for (let j = 1; j <= countriesData.length; j++) {
        const option = document.createElement('option');
        option.value = j;
        option.textContent = j;
        rankSelect.appendChild(option);
    }
    
    rankSelect.addEventListener('change', () => updateDisabledStatesForUser(userId));

    itemDiv.appendChild(rankSelect);
    return itemDiv;
}

function updateDisabledStatesForUser(userId) {
    const panel = document.getElementById(`${userId}-panel`);
    if (!panel) return;

    const allSelects = panel.querySelectorAll('.rank-select');
    const usedRanks = new Set();

    // First pass: collect all used ranks for this user
    allSelects.forEach(select => {
        if (select.value) {
            usedRanks.add(select.value);
        }
    });

    // Second pass: update options in all selects
    allSelects.forEach(select => {
        const currentSelectedValueInThisDropdown = select.value;
        for (let option of select.options) {
            option.style.color = ''; // Reset color to default
            option.disabled = false; // Reset disabled state

            if (option.value === "") { // Placeholder option
                continue;
            }

            // Check if this option's rank is one of the used ranks
            if (usedRanks.has(option.value)) {
                option.style.color = 'red'; // Mark as red because this rank is used somewhere
                
                // If this rank is used, AND it's NOT the one selected in THIS specific dropdown,
                // then disable it (because it's selected in another dropdown for another country).
                if (option.value !== currentSelectedValueInThisDropdown) {
                    option.disabled = true;
                }
            }
            // If option.value is not in usedRanks, it remains default color and enabled.
            // If option.value is in usedRanks AND IS currentSelectedValueInThisDropdown, it's red and enabled.
        }
    });
}

function validateVotes(votes) {
    const assignedRanks = Object.values(votes).map(rank => parseInt(rank, 10)).filter(rank => !isNaN(rank));
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

function saveUserVotes(userId) {
    const votes = {};
    const panel = document.getElementById(`${userId}-panel`);
    if (!panel) return; 

    panel.querySelectorAll('.rank-select').forEach(select => {
        if (select.value) { // Only include if a rank is selected
            votes[select.dataset.countryId] = parseInt(select.value, 10);
        }
    });

    const messageP = document.getElementById(`${userId}-message`);
    const validationError = validateVotes(votes);

    if (validationError) {
        messageP.textContent = validationError;
        messageP.className = 'message error';
        return;
    }

    localStorage.setItem(`eurovisionUserVotes_${userId}`, JSON.stringify(votes));
    messageP.textContent = '¡Votos guardados correctamente!';
    messageP.className = 'message success';
    playSound(SOUND_CONFIRM);
    // updateDisabledStatesForUser(userId); // Already called by the select's onchange, but good to ensure state consistency after save.
                                        // However, save doesn't change selections, so it might be redundant if onchange fired.
                                        // Let's keep it for robustness.
    updateDisabledStatesForUser(userId);
}

function loadUserVotes(userId) {
    const savedVotes = localStorage.getItem(`eurovisionUserVotes_${userId}`);
    if (savedVotes) {
        const votes = JSON.parse(savedVotes);
        const panel = document.getElementById(`${userId}-panel`);
        if (!panel) return; 

        Object.entries(votes).forEach(([countryId, rank]) => {
            const select = panel.querySelector(`.rank-select[data-country-id="${countryId}"]`);
            if (select) {
                select.value = rank;
            }
        });
    }
    updateDisabledStatesForUser(userId); // Crucial call after loading votes
}

function setupResetButton() {
    const resetButton = document.getElementById('reset-scores-button');
    const globalMessageP = document.getElementById('global-message');
    if (!resetButton || !globalMessageP) return;

    resetButton.addEventListener('click', () => {
        const password = prompt('Introduce la contraseña para resetear todas las puntuaciones:');
        if (password === RESET_PASSWORD) {
            for (let i = 1; i <= TOTAL_USERS; i++) {
                const userId = `user${i}`;
                localStorage.removeItem(`eurovisionUserVotes_${userId}`);
                 // Also clear any potential individual messages on currently non-visible user pages
                // This is tricky as those pages are not loaded. Reset primarily affects storage.
                // On next load of a user page, it will show as empty.
            }
            localStorage.removeItem('eurovisionAdminResults'); // Also reset admin results if desired, or make it separate. For now, reset all.
            
            globalMessageP.textContent = 'Todas las puntuaciones (usuarios y admin) han sido reseteadas.';
            globalMessageP.className = 'message success';
            playSound(SOUND_CONFIRM);
        } else if (password !== null) { 
            globalMessageP.textContent = 'Contraseña incorrecta.';
            globalMessageP.className = 'message error';
        } else {
            globalMessageP.textContent = ''; 
            globalMessageP.className = 'message';
        }
    });
}