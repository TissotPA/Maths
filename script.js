// Variables globales
let currentTab = 'troisieme';
let favorites = JSON.parse(localStorage.getItem('mathsFavorites') || '[]');
let autoPreviewEnabled = JSON.parse(localStorage.getItem('autoPreviewEnabled') || 'true');

// Variable globale pour les cartes - chargées depuis localStorage ou import
let mathCards = JSON.parse(localStorage.getItem('mathCards') || '{"troisieme":[],"seconde":[],"premiere":[],"terminale":[]}');

// Variables pour l'optimisation des performances
let mathJaxRenderTimeout = null;
let pendingRenderElements = new Set();

// Fonction utilitaire optimisée pour MathJax avec debouncing
function renderMathJax(element = null) {
    if (element) {
        pendingRenderElements.add(element);
    }
    
    // Annuler le rendu précédent s'il existe
    if (mathJaxRenderTimeout) {
        clearTimeout(mathJaxRenderTimeout);
    }
    
    // Programmer un nouveau rendu avec délai
    mathJaxRenderTimeout = setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
            const elementsToRender = element ? [element] : Array.from(pendingRenderElements);
            if (elementsToRender.length > 0 || !element) {
                MathJax.typesetPromise(element ? [element] : elementsToRender).catch((err) => {
                    console.log('Erreur MathJax:', err);
                });
                pendingRenderElements.clear();
            }
        } else {
            console.log('MathJax pas encore chargé, nouvelle tentative...');
            // Réessayer dans 500ms si MathJax n'est pas prêt
            setTimeout(() => renderMathJax(element), 500);
        }
        mathJaxRenderTimeout = null;
    }, 300); // Attendre 300ms avant de rendre
}

// Fonction de debouncing générique
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fonction de sauvegarde simple
function saveCards() {
    localStorage.setItem('mathCards', JSON.stringify(mathCards));
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeButtons();
    loadFavorites();
    loadSavedCards();
    initializeImageModal();
    initializeImageUpload();
    initializeSearchModal();
    initializeImportModal();
    
    // Forcer le rendu MathJax après un délai pour s'assurer que tout est chargé
    setTimeout(() => {
        if (window.MathJax) {
            console.log('✅ MathJax chargé et prêt');
            renderMathJax();
        } else {
            console.log('⚠️ MathJax pas encore chargé, nouvelle tentative...');
            setTimeout(() => renderMathJax(), 1000);
        }
    }, 500);
});

// Navigation entre les onglets
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Initialiser la navigation des sous-onglets
    initializeSubNavigation();
}

function initializeSubNavigation() {
    const subNavButtons = document.querySelectorAll('.sub-nav-btn');

    subNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            const subtabId = button.getAttribute('data-subtab');
            const level = subtabId.split('-')[0]; // ex: 'troisieme' from 'troisieme-fiches'
            switchSubTab(level, subtabId);
        });
    });
}

function switchTab(tabId) {
    // Retirer la classe active de tous les boutons et contenus
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Ajouter la classe active au bouton et contenu sélectionnés
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    currentTab = tabId;

    // Activer le premier sous-onglet par défaut (Fiches)
    setTimeout(() => {
        switchSubTab(tabId, `${tabId}-fiches`);
    }, 50);

    // Animation d'entrée
    const activeContent = document.getElementById(tabId);
    activeContent.style.opacity = '0';
    activeContent.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        activeContent.style.opacity = '1';
        activeContent.style.transform = 'translateY(0)';
    }, 50);
}

function switchSubTab(level, subtabId) {
    // Retirer la classe active de tous les sous-boutons et sous-contenus du niveau
    const levelContainer = document.getElementById(level);
    levelContainer.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    levelContainer.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));

    // Ajouter la classe active au sous-bouton et sous-contenu sélectionnés
    levelContainer.querySelector(`[data-subtab="${subtabId}"]`).classList.add('active');
    document.getElementById(subtabId).classList.add('active');
}

// Initialisation des boutons
function initializeButtons() {
    // Bouton toggle prévisualisation
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    previewToggleBtn.addEventListener('click', toggleAutoPreview);
    updatePreviewButtonState();

    // Bouton de recherche
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.addEventListener('click', showSearch);

    // Bouton favoris
    const favoriteBtn = document.getElementById('favoriteBtn');
    favoriteBtn.addEventListener('click', showFavorites);

    // Bouton de chargement des fiches par défaut
    const loadBtn = document.getElementById('loadBtn');
    loadBtn.addEventListener('click', loadDefaultCards);

    // Bouton nouvelle fiche
    const addNoteBtn = document.getElementById('addNoteBtn');
    addNoteBtn.addEventListener('click', showAddCardModal);

    // Boutons export/import
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.addEventListener('click', exportCards);
    
    const importBtn = document.getElementById('importBtn');
    importBtn.addEventListener('click', () => document.getElementById('importFileInput').click());
    
    const importFileInput = document.getElementById('importFileInput');
    importFileInput.addEventListener('change', handleImportFile);

    // Ajouter des événements aux cartes pour les favoris
    addCardEventListeners();

    // Initialiser la modal
    initializeModal();
    initializeEditModal();
}

// Fonctions pour gérer l'aperçu automatique
function toggleAutoPreview() {
    autoPreviewEnabled = !autoPreviewEnabled;
    localStorage.setItem('autoPreviewEnabled', JSON.stringify(autoPreviewEnabled));
    updatePreviewButtonState();
    
    if (autoPreviewEnabled) {
        showNotification('Prévisualisation automatique activée');
    } else {
        showNotification('Prévisualisation automatique désactivée - cliquez sur les champs pour voir l\'aperçu');
    }
}

function updatePreviewButtonState() {
    const previewToggleBtn = document.getElementById('previewToggleBtn');
    const icon = previewToggleBtn.querySelector('i');
    
    if (autoPreviewEnabled) {
        previewToggleBtn.classList.remove('btn-secondary');
        previewToggleBtn.classList.add('btn-primary');
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        previewToggleBtn.title = 'Prévisualisation automatique activée - Cliquer pour désactiver';
    } else {
        previewToggleBtn.classList.remove('btn-primary');
        previewToggleBtn.classList.add('btn-secondary');
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        previewToggleBtn.title = 'Prévisualisation automatique désactivée - Cliquer pour activer';
    }
}

// Fonction de recherche - Ouvrir le modal
function showSearch() {
    const modal = document.getElementById('searchModal');
    modal.style.display = 'flex';
    
    // Réinitialiser le formulaire
    document.getElementById('searchLevel').value = 'tous';
    document.getElementById('searchTitle').value = '';
    document.getElementById('searchResults').style.display = 'none';
    
    // Focus sur le champ titre
    setTimeout(() => {
        document.getElementById('searchTitle').focus();
    }, 100);
}

// Fermer le modal de recherche
function closeSearchModal() {
    document.getElementById('searchModal').style.display = 'none';
}

// Effectuer la recherche avec les critères
function performSearch(level, title) {
    let foundCards = [];
    
    // Obtenir toutes les fiches de tous les niveaux
    Object.keys(mathCards).forEach(cardLevel => {
        if (level === 'tous' || level === cardLevel) {
            mathCards[cardLevel].forEach((card, index) => {
                let matches = true;
                
                // Filtrer par titre si spécifié
                if (title && title.trim()) {
                    const titleLower = card.title.toLowerCase();
                    const searchTitleLower = title.toLowerCase();
                    matches = titleLower.includes(searchTitleLower);
                }
                
                if (matches) {
                    foundCards.push({
                        ...card,
                        level: cardLevel,
                        index: index,
                        levelDisplayName: getLevelDisplayName(cardLevel)
                    });
                }
            });
        }
    });
    
    displaySearchResults(foundCards, level, title);
}

// Obtenir le nom d'affichage du niveau
function getLevelDisplayName(level) {
    const levelNames = {
        'troisieme': 'Troisième',
        'seconde': 'Seconde', 
        'premiere': 'Première',
        'terminale': 'Terminale'
    };
    return levelNames[level] || level;
}

// Afficher les résultats de recherche
function displaySearchResults(results, level, title) {
    const resultsDiv = document.getElementById('searchResults');
    const resultsList = document.getElementById('searchResultsList');
    
    if (results.length === 0) {
        resultsList.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>Aucune fiche trouvée</p>
                <small>Essayez de modifier vos critères de recherche</small>
            </div>
        `;
    } else {
        resultsList.innerHTML = results.map(card => `
            <div class="search-result-item" onclick="openCardFromSearch('${card.level}', ${card.index})">
                <div class="search-result-header">
                    <div class="search-result-title">${card.title}</div>
                    <div class="search-result-level">${card.levelDisplayName}</div>
                </div>
                <div class="search-result-preview">
                    ${card.formulas ? card.formulas.substring(0, 100) + '...' : 'Cliquez pour voir les détails'}
                </div>
            </div>
        `).join('');
    }
    
    resultsDiv.style.display = 'block';
}

// Ouvrir une fiche depuis les résultats de recherche
function openCardFromSearch(level, cardIndex) {
    // Fermer le modal de recherche
    closeSearchModal();
    
    // Naviguer vers l'onglet approprié
    switchTab(level);
    
    // Attendre que l'onglet soit chargé puis faire défiler vers la fiche
    setTimeout(() => {
        const cards = document.querySelectorAll(`#${level} .card`);
        if (cards[cardIndex]) {
            cards[cardIndex].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Effet de surbrillance temporaire
            cards[cardIndex].style.border = '3px solid #38b2ac';
            cards[cardIndex].style.backgroundColor = '#e6fffa';
            
            setTimeout(() => {
                cards[cardIndex].style.border = '';
                cards[cardIndex].style.backgroundColor = '';
            }, 2000);
        }
    }, 200);
}

// Initialiser le modal de recherche
function initializeSearchModal() {
    const modal = document.getElementById('searchModal');
    const closeBtn = document.getElementById('closeSearchModal');
    const cancelBtn = document.getElementById('cancelSearch');
    const form = document.getElementById('searchForm');
    
    // Fermer le modal
    closeBtn.addEventListener('click', closeSearchModal);
    cancelBtn.addEventListener('click', closeSearchModal);
    
    // Fermer en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeSearchModal();
        }
    });
    
    // Gérer la soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const level = document.getElementById('searchLevel').value;
        const title = document.getElementById('searchTitle').value;
        performSearch(level, title);
    });
    
    // Recherche en temps réel lors de la saisie
    document.getElementById('searchTitle').addEventListener('input', function() {
        const level = document.getElementById('searchLevel').value;
        const title = this.value;
        
        // Recherche automatique après 300ms de pause dans la saisie
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            performSearch(level, title);
        }, 300);
    });
    
    // Recherche lors du changement de niveau
    document.getElementById('searchLevel').addEventListener('change', function() {
        const title = document.getElementById('searchTitle').value;
        performSearch(this.value, title);
    });
}

function showSearchResults(results) {
    let message = `Résultats de recherche (${results.length}) :\n\n`;
    results.forEach((result, index) => {
        const tabName = getTabDisplayName(result.tab);
        message += `${index + 1}. ${result.title} (${tabName})\n`;
    });
    
    const choice = prompt(message + '\nEntrez le numéro de la fiche à consulter :');
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= results.length) {
        const selectedResult = results[choiceNum - 1];
        switchTab(selectedResult.tab);
        
        // Faire défiler vers la carte
        setTimeout(() => {
            selectedResult.element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Effet de surbrillance
            selectedResult.element.style.border = '3px solid #68d391';
            selectedResult.element.style.transform = 'scale(1.02)';
            
            setTimeout(() => {
                selectedResult.element.style.border = '';
                selectedResult.element.style.transform = '';
            }, 2000);
        }, 300);
    }
}

// Gestion des favoris
function addCardEventListeners() {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        // Ajouter un bouton favori à chaque carte
        const cardHeader = card.querySelector('.card-header');
        const favoriteIcon = document.createElement('i');
        favoriteIcon.className = 'fas fa-star favorite-icon';
        favoriteIcon.title = 'Ajouter aux favoris';
        favoriteIcon.style.marginLeft = 'auto';
        favoriteIcon.style.cursor = 'pointer';
        favoriteIcon.style.color = '#cbd5e0';
        favoriteIcon.style.transition = 'color 0.3s ease';
        
        const cardId = `${card.closest('.tab-content').id}-${index}`;
        card.setAttribute('data-card-id', cardId);
        
        if (favorites.includes(cardId)) {
            favoriteIcon.style.color = '#fbbf24';
        }
        
        favoriteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(cardId, favoriteIcon);
        });
        
        cardHeader.appendChild(favoriteIcon);
    });
}

function toggleFavorite(cardId, iconElement) {
    const index = favorites.indexOf(cardId);
    
    if (index === -1) {
        // Ajouter aux favoris
        favorites.push(cardId);
        iconElement.style.color = '#fbbf24';
        showNotification('Ajouté aux favoris !');
    } else {
        // Retirer des favoris
        favorites.splice(index, 1);
        iconElement.style.color = '#cbd5e0';
        showNotification('Retiré des favoris !');
    }
    
    localStorage.setItem('mathsFavorites', JSON.stringify(favorites));
}

function showFavorites() {
    if (favorites.length === 0) {
        alert('Aucune fiche favorite pour le moment.');
        return;
    }
    
    let message = 'Vos fiches favorites :\n\n';
    favorites.forEach((cardId, index) => {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (card) {
            const title = card.querySelector('h3').textContent;
            const tab = getTabDisplayName(cardId.split('-')[0]);
            message += `${index + 1}. ${title} (${tab})\n`;
        }
    });
    
    const choice = prompt(message + '\nEntrez le numéro de la fiche à consulter :');
    const choiceNum = parseInt(choice);
    
    if (choiceNum >= 1 && choiceNum <= favorites.length) {
        const cardId = favorites[choiceNum - 1];
        const tabId = cardId.split('-')[0];
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        
        switchTab(tabId);
        
        setTimeout(() => {
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            
            // Effet de surbrillance
            card.style.border = '3px solid #fbbf24';
            card.style.transform = 'scale(1.02)';
            
            setTimeout(() => {
                card.style.border = '';
                card.style.transform = '';
            }, 2000);
        }, 300);
    }
}

function loadFavorites() {
    // Cette fonction est appelée à l'initialisation
    // Les favoris sont déjà chargés dans addCardEventListeners
}

// Chargement des fiches par défaut
async function loadDefaultCards() {
    try {
        // Vérifier si des fiches existent déjà
        const existingCards = JSON.parse(localStorage.getItem('mathCards') || '{}');
        const hasExistingCards = Object.keys(existingCards).some(level => 
            existingCards[level] && existingCards[level].length > 0
        );

        if (hasExistingCards) {
            const confirmLoad = confirm('Des fiches existent déjà. Voulez-vous les remplacer par les fiches par défaut ?');
            if (!confirmLoad) {
                return;
            }
        }

        // Charger le fichier JSON
        const response = await fetch('./Fiches/fiches.json');
        
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement: ${response.status}`);
        }

        const defaultCards = await response.json();
        
        // Extraire les données mathCards si elles sont dans ce format
        const cardsData = defaultCards.mathCards || defaultCards;
        
        // Sauvegarder les nouvelles fiches
        localStorage.setItem('mathCards', JSON.stringify(cardsData));
        
        // Recharger l'affichage
        loadSavedCards();
        updateCardCounts();
        
        // Message de confirmation
        alert('Fiches par défaut chargées avec succès !');
        
    } catch (error) {
        console.error('Erreur lors du chargement des fiches par défaut:', error);
        
        if (error.message.includes('404')) {
            alert('Le fichier Fiches/fiches.json n\'a pas été trouvé sur le serveur.\n\nVérifiez que le fichier est bien présent sur GitHub Pages.');
        } else if (error.message.includes('Failed to fetch')) {
            alert('Impossible de se connecter au serveur.\n\nVérifiez votre connexion internet et que vous êtes sur GitHub Pages.');
        } else {
            alert(`Erreur lors du chargement des fiches par défaut:\n${error.message}\n\nConsultez la console pour plus de détails.`);
        }
    }
}

// Gestion de la modal pour ajouter une fiche
function showAddCardModal() {
    const modal = document.getElementById('addCardModal');
    const levelSelect = document.getElementById('cardLevel');
    
    // Pré-sélectionner le niveau actuel
    levelSelect.value = currentTab;
    
    modal.style.display = 'block';
    
    // Focus sur le premier champ
    setTimeout(() => {
        document.getElementById('cardTitle').focus();
    }, 100);
}

function initializeModal() {
    const modal = document.getElementById('addCardModal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancelCard');
    const form = document.getElementById('addCardForm');
    
    // Fermer la modal
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Fermer en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Soumettre le formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        createCardFromForm();
    });
    
    // Prévisualisation des formules en temps réel
    addMathPreview();

    // Gestion du nombre d'exercices
    initializeExerciseManager();
}

function closeModal() {
    const modal = document.getElementById('addCardModal');
    modal.style.display = 'none';
    
    // Réinitialiser le formulaire
    document.getElementById('addCardForm').reset();
}

function addMathPreview() {
    const formulasTextarea = document.getElementById('cardFormulas');
    const examplesTextarea = document.getElementById('cardExamples');
    
    if (autoPreviewEnabled) {
        // Mode auto : prévisualisation dès le focus
        formulasTextarea.addEventListener('focus', function() {
            if (!this.hasPreview) {
                addPreviewToTextarea(this);
                this.hasPreview = true;
            }
        }, { once: true });
        
        examplesTextarea.addEventListener('focus', function() {
            if (!this.hasPreview) {
                addPreviewToTextarea(this);
                this.hasPreview = true;
            }
        }, { once: true });
    } else {
        // Mode manuel : ajouter un bouton pour activer la prévisualisation
        addPreviewButtonToTextarea(formulasTextarea);
        addPreviewButtonToTextarea(examplesTextarea);
    }
}

function addPreviewButtonToTextarea(textarea) {
    const existingBtn = textarea.parentNode.querySelector('.preview-toggle-btn');
    if (existingBtn) return;
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn preview-toggle-btn';
    button.innerHTML = '<i class="fas fa-eye"></i> Activer l\'aperçu';
    button.style.marginTop = '5px';
    
    button.addEventListener('click', function() {
        if (!textarea.hasPreview) {
            addPreviewToTextarea(textarea);
            textarea.hasPreview = true;
            button.innerHTML = '<i class="fas fa-eye-slash"></i> Masquer l\'aperçu';
        } else {
            const preview = textarea.parentNode.querySelector('.math-preview');
            if (preview) {
                preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
                button.innerHTML = preview.style.display === 'none' ? 
                    '<i class="fas fa-eye"></i> Afficher l\'aperçu' : 
                    '<i class="fas fa-eye-slash"></i> Masquer l\'aperçu';
            }
        }
    });
    
    textarea.parentNode.appendChild(button);
}

function addPreviewToTextarea(textarea) {
    let previewDiv = textarea.parentNode.querySelector('.math-preview');
    
    if (!previewDiv) {
        previewDiv = document.createElement('div');
        previewDiv.className = 'math-preview';
        previewDiv.innerHTML = '<h4>Aperçu:</h4><div class="preview-content"></div>';
        textarea.parentNode.appendChild(previewDiv);
    }
    
    const previewContent = previewDiv.querySelector('.preview-content');
    
    // Fonction de mise à jour avec debouncing pour éviter les lags
    const updatePreview = debounce(function(text) {
        if (text.trim()) {
            previewContent.innerHTML = convertNewlinesToHTML(text);
            renderMathJax(previewContent);
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
    }, 500); // Attendre 500ms après la fin de saisie
    
    textarea.addEventListener('input', function() {
        updatePreview(textarea.value);
    });
}

function initializeExerciseManager() {
    const exerciseCountSelect = document.getElementById('exerciseCount');
    const exercisesContainer = document.getElementById('exercisesContainer');

    exerciseCountSelect.addEventListener('change', function() {
        const count = parseInt(this.value);
        updateExerciseFields(count, exercisesContainer);
    });
}

function updateExerciseFields(count, container) {
    const existingCount = container.children.length;
    
    if (count === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // Supprimer les exercices en trop
    while (container.children.length > count) {
        container.removeChild(container.lastChild);
    }
    
    // Ajouter les exercices manquants (optimisation: ne recrée que ce qui manque)
    for (let i = existingCount + 1; i <= count; i++) {
        createSingleExerciseField(i, container);
    }
}

// Fonction optimisée pour créer un seul exercice
function createSingleExerciseField(exerciseNumber, container) {
    const exerciseBlock = document.createElement('div');
    exerciseBlock.className = 'exercise-block';
    
    // Template plus léger sans prévisualisation automatique
    exerciseBlock.innerHTML = `
        <h4><i class="fas fa-pencil-alt"></i> Exercice ${exerciseNumber}</h4>
        <div class="form-group">
            <label for="exercise${exerciseNumber}Statement">Énoncé de l'exercice ${exerciseNumber}</label>
            <textarea id="exercise${exerciseNumber}Statement" placeholder="Énoncé de l'exercice avec formules LaTeX si nécessaire"></textarea>
            <small class="form-help">
                <strong>Formatage :</strong> **gras**, *italique*, ++souligné++, ==surligné==, \`code\` + LaTeX : $formule$
            </small>
            <div class="image-help">
                <strong>Images :</strong> <code>![Description](./Figures/image.png)</code><br>
                <button type="button" class="btn-insert-local" data-target="exercise${exerciseNumber}Statement">
                    <i class="fas fa-folder"></i> Figures
                </button>
                <button type="button" class="btn-upload-image" data-target="exercise${exerciseNumber}Statement">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <input type="file" class="image-file-input" accept="image/*" style="display: none;">
            </div>
        </div>
        <div class="form-group">
            <label for="exercise${exerciseNumber}Solution">Correction de l'exercice ${exerciseNumber}</label>
            <textarea id="exercise${exerciseNumber}Solution" placeholder="Solution détaillée avec étapes et calculs"></textarea>
            <small class="form-help">
                <strong>Formatage :</strong> **gras**, *italique*, ++souligné++, ==surligné==, \`code\` + LaTeX : $formule$
            </small>
            <div class="image-help">
                <strong>Images :</strong> <code>![Description](./Figures/image.png)</code><br>
                <button type="button" class="btn-insert-local" data-target="exercise${exerciseNumber}Solution">
                    <i class="fas fa-folder"></i> Figures
                </button>
                <button type="button" class="btn-upload-image" data-target="exercise${exerciseNumber}Solution">
                    <i class="fas fa-upload"></i> Upload
                </button>
                <input type="file" class="image-file-input" accept="image/*" style="display: none;">
            </div>
        </div>
    `;
    
    container.appendChild(exerciseBlock);
    
    // Ajouter la prévisualisation de manière différée (lazy loading)
    const statementTextarea = exerciseBlock.querySelector(`#exercise${exerciseNumber}Statement`);
    const solutionTextarea = exerciseBlock.querySelector(`#exercise${exerciseNumber}Solution`);
    
    // Ajouter les prévisualisations seulement quand l'utilisateur focus sur le textarea
    statementTextarea.addEventListener('focus', function() {
        if (!this.hasPreview) {
            addPreviewToTextarea(this);
            this.hasPreview = true;
        }
    }, { once: true });
    
    solutionTextarea.addEventListener('focus', function() {
        if (!this.hasPreview) {
            addPreviewToTextarea(this);
            this.hasPreview = true;
        }
    }, { once: true });
}

function createCardFromForm() {
    const level = document.getElementById('cardLevel').value;
    const title = document.getElementById('cardTitle').value.trim();
    const formulas = document.getElementById('cardFormulas').value.trim();
    const examples = document.getElementById('cardExamples').value.trim();
    const exerciseCount = parseInt(document.getElementById('exerciseCount').value);
    
    if (!level || !title) {
        alert('Veuillez remplir au moins le niveau et le titre.');
        return;
    }
    
    // Récupérer les exercices
    const exercises = [];
    for (let i = 1; i <= exerciseCount; i++) {
        const statement = document.getElementById(`exercise${i}Statement`)?.value.trim() || '';
        const solution = document.getElementById(`exercise${i}Solution`)?.value.trim() || '';
        
        if (statement || solution) {
            exercises.push({
                id: i,
                statement: statement,
                solution: solution
            });
        }
    }
    
    // Créer les données de la carte
    const cardData = {
        title: title,
        formulas: formulas,
        examples: examples,
        exercises: exercises,
        timestamp: Date.now()
    };
    
    // Sauvegarder dans le localStorage
    saveCardToStorage(level, cardData);
    
    // Créer les trois types de cartes
    const ficheCard = createFicheCard(title, formulas, examples);
    const exerciceCard = createExerciceCard(title, exercises);
    const correctionCard = createCorrectionCard(title, exercises);
    
    // Ajouter les cartes aux bons sous-onglets
    const ficheGrid = document.querySelector(`#${level}-fiches .cards-grid`);
    const exerciceGrid = document.querySelector(`#${level}-exercices .cards-grid`);
    const correctionGrid = document.querySelector(`#${level}-corrections .cards-grid`);
    
    ficheGrid.appendChild(ficheCard);
    exerciceGrid.appendChild(exerciceCard);
    correctionGrid.appendChild(correctionCard);
    
    // Ajouter les événements aux nouvelles cartes
    addEventListenersToCard(ficheCard);
    addEventListenersToCard(exerciceCard);
    addEventListenersToCard(correctionCard);
    
    // Passer au bon onglet si nécessaire
    if (level !== currentTab) {
        switchTab(level);
    } else {
        // Aller au sous-onglet Fiches pour voir la nouvelle carte
        switchSubTab(level, `${level}-fiches`);
    }
    
    // Fermer la modal
    closeModal();
    
    showNotification('Nouvelle fiche ajoutée dans les 3 onglets !');
    
    // Faire défiler vers la nouvelle carte et rendre MathJax de manière optimisée
    setTimeout(() => {
        ficheCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Re-render MathJax pour toutes les nouvelles cartes en une seule fois (plus efficace)
        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([ficheCard, exerciceCard, correctionCard]).catch(() => {});
        }
    }, 300);
}

function createFicheCard(title, formulas, examples, isDefault = false) {
    const card = document.createElement('div');
    card.className = isDefault ? 'card default-card' : 'card';
    
    let contentSections = '';
    
    if (formulas) {
        contentSections += `
            <div class="math-section">
                <h4><i class="fas fa-calculator"></i> Formules principales</h4>
                <div class="math-formula">${convertNewlinesToHTML(formulas)}</div>
            </div>
        `;
    }
    
    if (examples) {
        contentSections += `
            <div class="math-section">
                <h4><i class="fas fa-lightbulb"></i> Exemples</h4>
                <div>${convertNewlinesToHTML(examples)}</div>
            </div>
        `;
    }
    
    const defaultBadge = isDefault ? '<span class="default-badge"><i class="fas fa-graduation-cap"></i> Cours</span>' : '';
    
    card.innerHTML = `
        <div class="card-header">
            <i class="fas fa-book-open"></i>
            <h3>${title}</h3>
            ${defaultBadge}
        </div>
        <div class="card-content">
            ${contentSections || '<p>Fiche en cours de rédaction...</p>'}
        </div>
    `;
    
    return card;
}

function createExerciceCard(title, exercises) {
    const card = document.createElement('div');
    card.className = 'card';
    
    let exerciceContent = '';
    
    if (exercises && exercises.length > 0) {
        exerciceContent = exercises.map((ex, index) => `
            <div class="math-section">
                <h4><i class="fas fa-pencil-alt"></i> Exercice ${ex.id}</h4>
                <div>${convertNewlinesToHTML(ex.statement)}</div>
            </div>
        `).join('');
    } else {
        exerciceContent = '<p>Aucun exercice associé à cette fiche.</p>';
    }
    
    card.innerHTML = `
        <div class="card-header">
            <i class="fas fa-tasks"></i>
            <h3>${title}</h3>
        </div>
        <div class="card-content">
            ${exerciceContent}
        </div>
    `;
    
    return card;
}

function createCorrectionCard(title, exercises) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Générer un ID unique pour cette carte
    const cardId = Date.now() + Math.random();
    
    let correctionContent = '';
    
    if (exercises && exercises.length > 0) {
        correctionContent = exercises.map((ex, index) => {
            const uniqueId = `correction-${cardId}-${ex.id}`;
            return `
                <div class="math-section correction-section">
                    <div class="correction-header" onclick="toggleCorrectionById('${uniqueId}', this)">
                        <h4><i class="fas fa-check-circle"></i> Solution exercice ${ex.id}</h4>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="correction-content" id="${uniqueId}" style="display: none;">
                        ${convertNewlinesToHTML(ex.solution) || '<em>Correction à compléter...</em>'}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        correctionContent = '<p>Aucune correction disponible.</p>';
    }
    
    card.innerHTML = `
        <div class="card-header">
            <i class="fas fa-clipboard-check"></i>
            <h3>${title}</h3>
        </div>
        <div class="card-content">
            ${correctionContent}
        </div>
    `;
    
    return card;
}

function addEventListenersToCard(card) {
    const cardHeader = card.querySelector('.card-header');
    const isDefaultCard = card.classList.contains('default-card');
    
    // Conteneur pour les actions
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'card-actions';
    actionsContainer.style.marginLeft = 'auto';
    actionsContainer.style.display = 'flex';
    actionsContainer.style.gap = '10px';
    
    // Bouton d'édition
    const editIcon = document.createElement('i');
    editIcon.className = 'fas fa-edit';
    editIcon.title = 'Modifier la fiche';
    editIcon.style.cursor = 'pointer';
    editIcon.style.color = '#718096';
    editIcon.style.transition = 'color 0.3s ease';
    editIcon.style.padding = '5px';
    
    editIcon.addEventListener('mouseenter', () => {
        editIcon.style.color = '#38a169';
    });
    
    editIcon.addEventListener('mouseleave', () => {
        editIcon.style.color = '#718096';
    });
    
    // Bouton favoris
    const favoriteIcon = document.createElement('i');
    favoriteIcon.className = 'fas fa-star favorite-icon';
    favoriteIcon.title = 'Ajouter aux favoris';
    favoriteIcon.style.cursor = 'pointer';
    favoriteIcon.style.color = '#cbd5e0';
    favoriteIcon.style.transition = 'color 0.3s ease';
    favoriteIcon.style.padding = '5px';
    
    const cardId = `${currentTab}-${Date.now()}`;
    card.setAttribute('data-card-id', cardId);
    
    if (favorites.includes(cardId)) {
        favoriteIcon.style.color = '#fbbf24';
    }
    
    editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDefaultCard) {
            showNotification('Les fiches du cours ne peuvent pas être modifiées. Créez une nouvelle fiche personnelle !');
        } else {
            editCard(card);
        }
    });
    
    favoriteIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(cardId, favoriteIcon);
    });

    actionsContainer.appendChild(editIcon);
    actionsContainer.appendChild(favoriteIcon);
    
    // Bouton de suppression seulement pour les fiches personnelles
    if (!isDefaultCard) {
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteIcon.title = 'Supprimer la fiche';
        deleteIcon.style.cursor = 'pointer';
        deleteIcon.style.color = '#718096';
        deleteIcon.style.transition = 'color 0.3s ease';
        deleteIcon.style.padding = '5px';
        
        deleteIcon.addEventListener('mouseenter', () => {
            deleteIcon.style.color = '#e53e3e';
        });
        
        deleteIcon.addEventListener('mouseleave', () => {
            deleteIcon.style.color = '#718096';
        });
        
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteCard(card, cardId);
        });
        
        actionsContainer.appendChild(deleteIcon);
    }
    
    cardHeader.appendChild(actionsContainer);
}

// Fonctions utilitaires
function getTabDisplayName(tabId) {
    const names = {
        'troisieme': 'Troisième',
        'seconde': 'Seconde',
        'premiere': 'Première',
        'terminale': 'Terminale'
    };
    return names[tabId] || tabId;
}

function showNotification(message) {
    // Créer une notification temporaire
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #38a169;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // Ajouter l'animation CSS
    if (!document.querySelector('#notificationStyle')) {
        const style = document.createElement('style');
        style.id = 'notificationStyle';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fonction de suppression de fiche
function confirmDeleteCard(card, cardId) {
    // Créer une modal de confirmation
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal confirmation-modal';
    confirmModal.style.display = 'block';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle" style="color: #e53e3e; margin-right: 8px;"></i> Confirmer la suppression</h3>
            </div>
            <div class="modal-body">
                <p>Êtes-vous sûr de vouloir supprimer cette fiche ?</p>
                <p style="color: #718096; font-size: 0.9em; margin-top: 10px;">
                    <strong>Cette action est irréversible.</strong><br>
                    La fiche sera supprimée de tous les onglets (Fiches, Exercices, Corrections).
                </p>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary cancel-delete">Annuler</button>
                <button type="button" class="btn confirm-delete" style="background: #e53e3e; color: white;">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Gestion des boutons
    const cancelBtn = confirmModal.querySelector('.cancel-delete');
    const confirmBtn = confirmModal.querySelector('.confirm-delete');
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(confirmModal);
    });
    
    confirmBtn.addEventListener('click', () => {
        deleteCard(card, cardId);
        document.body.removeChild(confirmModal);
    });
    
    // Fermer en cliquant à l'extérieur
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            document.body.removeChild(confirmModal);
        }
    });
}

function deleteCard(card, cardId) {
    try {
        // Obtenir les informations de la carte
        const cardTitle = card.querySelector('.card-header h3').textContent;
        const cardLevel = getCurrentLevelFromCard(card);
        
        console.log('Suppression de la carte:', { cardTitle, cardLevel, cardId });
        
        // Supprimer des favoris si présent
        const favoriteIndex = favorites.indexOf(cardId);
        if (favoriteIndex > -1) {
            favorites.splice(favoriteIndex, 1);
            localStorage.setItem('mathsFavorites', JSON.stringify(favorites));
        }
        
        // Supprimer de localStorage - méthode améliorée
        if (mathCards[cardLevel]) {
            const originalLength = mathCards[cardLevel].length;
            mathCards[cardLevel] = mathCards[cardLevel].filter(c => c.title !== cardTitle);
            
            console.log(`Cartes supprimées du localStorage: ${originalLength - mathCards[cardLevel].length}`);
            saveCards();
        }
        
        // Supprimer visuellement des trois onglets
        const ficheGrid = document.querySelector(`#${cardLevel}-fiches .cards-grid`);
        const exerciceGrid = document.querySelector(`#${cardLevel}-exercices .cards-grid`);
        const correctionGrid = document.querySelector(`#${cardLevel}-corrections .cards-grid`);
        
        // Trouver et supprimer les cartes correspondantes dans tous les onglets
        let cardsRemoved = 0;
        [ficheGrid, exerciceGrid, correctionGrid].forEach((grid, gridIndex) => {
            if (grid) {
                const cards = Array.from(grid.children);
                console.log(`Recherche dans grille ${gridIndex}: ${cards.length} cartes trouvées`);
                
                cards.forEach(c => {
                    const titleElement = c.querySelector('.card-header h3');
                    const title = titleElement ? titleElement.textContent.trim() : '';
                    
                    if (title === cardTitle.trim()) {
                        cardsRemoved++;
                        console.log(`Suppression de la carte: ${title}`);
                        
                        // Animation de suppression
                        c.style.transition = 'all 0.3s ease';
                        c.style.transform = 'scale(0.8)';
                        c.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (c.parentNode) {
                                c.parentNode.removeChild(c);
                                console.log('Carte supprimée du DOM');
                            }
                        }, 300);
                    }
                });
            }
        });
        
        console.log(`Total cartes supprimées: ${cardsRemoved}`);
        
        showNotification(`Fiche "${cardTitle}" supprimée avec succès`);
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('Erreur lors de la suppression de la fiche');
    }
}

function getCurrentLevelFromCard(card) {
    // Trouver le niveau en remontant dans le DOM
    let parent = card.parentElement;
    while (parent) {
        const id = parent.id;
        if (id && (id.includes('troisieme') || id.includes('seconde') || 
                   id.includes('premiere') || id.includes('terminale'))) {
            if (id.includes('troisieme')) return 'troisieme';
            if (id.includes('seconde')) return 'seconde';
            if (id.includes('premiere')) return 'premiere';
            if (id.includes('terminale')) return 'terminale';
        }
        parent = parent.parentElement;
    }
    return currentTab; // Fallback
}

// Raccourcis clavier
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey) {
        switch(e.key) {
            case 'f':
                e.preventDefault();
                showSearch();
                break;
            case 'l':
                e.preventDefault();
                loadDefaultCards();
                break;
            case '1':
                e.preventDefault();
                switchTab('troisieme');
                break;
            case '2':
                e.preventDefault();
                switchTab('seconde');
                break;
            case '3':
                e.preventDefault();
                switchTab('premiere');
                break;
            case '4':
                e.preventDefault();
                switchTab('terminale');
                break;
        }
    }
});

// Gestion du responsive - ajuster la navigation sur mobile
function handleResize() {
    const nav = document.querySelector('.nav');
    if (window.innerWidth <= 768) {
        nav.style.flexDirection = 'column';
    } else {
        nav.style.flexDirection = 'row';
    }
}

window.addEventListener('resize', handleResize);
handleResize(); // Appel initial

// Sauvegarde et chargement des fiches
function saveCardToStorage(level, cardData) {
    if (!mathCards[level]) {
        mathCards[level] = [];
    }
    
    mathCards[level].push(cardData);
    saveCards();
}

function loadSavedCards() {
    Object.keys(mathCards).forEach(level => {
        const ficheGrid = document.querySelector(`#${level}-fiches .cards-grid`);
        const exerciceGrid = document.querySelector(`#${level}-exercices .cards-grid`);
        const correctionGrid = document.querySelector(`#${level}-corrections .cards-grid`);
        
        if (ficheGrid && exerciceGrid && correctionGrid && mathCards[level]) {
            mathCards[level].forEach((cardData, index) => {
                // Créer les trois types de cartes
                const ficheCard = createFicheCard(cardData.title, cardData.formulas, cardData.examples, cardData.isDefault);
                const exerciceCard = createExerciceCard(cardData.title, cardData.exercises);
                const correctionCard = createCorrectionCard(cardData.title, cardData.exercises);
                
                // Ajouter aux grilles respectives
                ficheGrid.appendChild(ficheCard);
                exerciceGrid.appendChild(exerciceCard);
                correctionGrid.appendChild(correctionCard);
                
                // Ajouter les événements
                addEventListenersToCard(ficheCard);
                addEventListenersToCard(exerciceCard);
                addEventListenersToCard(correctionCard);
            });
        }
    });
    
    // Re-render MathJax après le chargement
    setTimeout(() => {
        renderMathJax();
    }, 100);
}

// Variables globales pour l'édition
let currentEditingCard = null;
let currentEditingIndex = -1;
let currentEditingLevel = '';

// Fonction utilitaire pour convertir les retours à la ligne et le formatage
function convertNewlinesToHTML(text) {
    if (!text) return '';
    
    // Appliquer directement tout le formatage (texte + images)
    let formattedText = applyTextFormatting(text);
    
    // Normaliser les retours à la ligne (Windows, Mac, Unix)
    formattedText = formattedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Diviser le texte en paragraphes (double retour à la ligne ou plus)
    const paragraphs = formattedText.split(/\n\s*\n+/);
    
    // Si on a plusieurs paragraphes, les traiter séparément
    if (paragraphs.length > 1) {
        const convertedParagraphs = paragraphs.map(paragraph => {
            const trimmed = paragraph.trim();
            if (!trimmed) return '';
            
            // Convertir les simples retours à la ligne en <br> dans chaque paragraphe
            const withBreaks = trimmed.replace(/\n/g, '<br>');
            return `<p>${withBreaks}</p>`;
        }).filter(p => p); // Supprimer les paragraphes vides
        
        return convertedParagraphs.join('');
    } else {
        // Un seul bloc : convertir tous les retours à la ligne en <br>
        const trimmed = formattedText.trim();
        return trimmed.replace(/\n/g, '<br>');
    }
}

// Fonction pour appliquer le formatage de texte (gras, italique, souligné, surligné, images)
function applyTextFormatting(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Traiter les images d'abord
    formatted = formatted.replace(/!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g, function(match, alt, url, title) {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${url}" alt="${alt}"${titleAttr} class="content-image">`;
    });
    
    // Appliquer les formatages de texte en évitant le contenu des formules LaTeX
    // Regex qui évite le contenu entre $ et entre $$
    
    // Gras : **texte** (éviter le contenu LaTeX)
    formatted = formatted.replace(/\*\*([^*$]+?(?:\$[^$]*\$[^*$]*?)*?[^*$]*?)\*\*/g, function(match, content) {
        // Si le contenu contient des $, on ne formate pas
        if (content.includes('$')) {
            return match;
        }
        return '<strong>' + content + '</strong>';
    });
    
    // Gras : __texte__ (éviter le contenu LaTeX) 
    formatted = formatted.replace(/__([^_$]+?(?:\$[^$]*\$[^_$]*?)*?[^_$]*?)__/g, function(match, content) {
        if (content.includes('$')) {
            return match;
        }
        return '<strong>' + content + '</strong>';
    });
    
    // Souligné : ++texte++
    formatted = formatted.replace(/\+\+([^+$]+?(?:\$[^$]*\$[^+$]*?)*?[^+$]*?)\+\+/g, function(match, content) {
        if (content.includes('$')) {
            return match;
        }
        return '<u>' + content + '</u>';
    });
    
    // Surligné : ==texte==
    formatted = formatted.replace(/==([^=$]+?(?:\$[^$]*\$[^=$]*?)*?[^=$]*?)==/g, function(match, content) {
        if (content.includes('$')) {
            return match;
        }
        return '<mark>' + content + '</mark>';
    });
    
    // Code inline : `texte` (mais pas si c'est dans une formule LaTeX)
    formatted = formatted.replace(/`([^`$\n]+?)`/g, function(match, content) {
        // Vérifier si on est dans une formule LaTeX en regardant le contexte
        return '<code>' + content + '</code>';
    });
    
    // Italique : *texte* (le plus délicat à cause des indices LaTeX)
    // On évite complètement les _ et * dans les formules LaTeX
    formatted = formatted.replace(/(?<!\*)\*([^*$\n]+?)\*(?!\*)/g, function(match, content) {
        if (content.includes('$')) {
            return match;
        }
        return '<em>' + content + '</em>';
    });
    
    // Pour l'underscore, on est très prudent et on évite tout formatage si $ est présent dans la ligne
    const lines = formatted.split('\n');
    formatted = lines.map(line => {
        if (line.includes('$')) {
            // Si la ligne contient des formules LaTeX, on ne touche pas aux _
            return line;
        } else {
            // Sinon on peut formater normalement
            return line.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>');
        }
    }).join('\n');
    
    return formatted;
}

// Initialisation du modal des images
function initializeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = modal.querySelector('.image-close');
    
    // Fermer le modal en cliquant sur la croix
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Fermer le modal en cliquant à l'extérieur de l'image
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Écouter les événements de clic sur les images (délégation d'événements)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('content-image')) {
            const originalSrc = event.target.src;
            const originalAlt = event.target.alt;
            
            modal.style.display = 'block';
            modalImg.src = originalSrc;
            modalImg.alt = originalAlt;
            
            // Gérer les erreurs de chargement
            modalImg.onerror = function() {
                modal.style.display = 'none';
                // Vérifier le type d'erreur et donner des conseils
                if (originalSrc.startsWith('data:image/')) {
                    alert('Erreur : L\'image semble être corrompue ou mal formatée.');
                } else if (originalSrc.startsWith('./Figures/')) {
                    const fileName = originalSrc.replace('./Figures/', '');
                    alert(
                        'Erreur : Impossible de charger l\'image du dossier Figures.\n\n' +
                        'Fichier recherché : ' + fileName + '\n\n' +
                        'Vérifiez que :\n' +
                        '• Le dossier "Figures" existe à côté du fichier HTML\n' +
                        '• Le fichier "' + fileName + '" existe dans ce dossier\n' +
                        '• Le nom du fichier ne contient pas de caractères spéciaux\n' +
                        '• L\'extension du fichier est correcte (.png, .jpg, etc.)'
                    );
                } else {
                    alert('Erreur lors du chargement de l\'image : ' + originalSrc);
                }
            };
        }
    });
    
    // Fermer avec la touche Échap
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Initialisation de l'upload d'images locales
function initializeImageUpload() {
    // Écouter les clics sur les boutons d'upload
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('btn-upload-image') || 
            event.target.closest('.btn-upload-image')) {
            
            const button = event.target.closest('.btn-upload-image') || event.target;
            const targetTextareaId = button.getAttribute('data-target');
            const fileInput = button.parentNode.querySelector('.image-file-input');
            
            // Associer le textarea cible à l'input file
            fileInput.setAttribute('data-target', targetTextareaId);
            fileInput.click();
        }
        
        // Écouter les clics sur les boutons d'insertion locale
        if (event.target.classList.contains('btn-insert-local') || 
            event.target.closest('.btn-insert-local')) {
            
            const button = event.target.closest('.btn-insert-local') || event.target;
            const targetTextareaId = button.getAttribute('data-target');
            showLocalImageDialog(targetTextareaId);
        }
    });
    
    // Écouter les changements sur les inputs file
    document.addEventListener('change', function(event) {
        if (event.target.classList.contains('image-file-input')) {
            const fileInput = event.target;
            const targetTextareaId = fileInput.getAttribute('data-target');
            const file = fileInput.files[0];
            
            if (file) {
                handleImageUpload(file, targetTextareaId, fileInput);
            }
        }
    });
}

// Gérer l'upload d'une image locale
function handleImageUpload(file, targetTextareaId, fileInput) {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
        showUploadError('Veuillez sélectionner un fichier image valide.', fileInput);
        return;
    }
    
    // Vérifier la taille (limite à 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showUploadError('L\'image est trop volumineuse (max 5MB). Essayez de redimensionner votre image.', fileInput);
        return;
    }
    
    // Afficher l'indicateur de progression
    showUploadProgress('Traitement de l\'image...', fileInput);
    
    // Si l'image est très grande, la redimensionner pour améliorer les performances
    if (file.size > 1024 * 1024) { // Plus de 1MB
        resizeAndProcessImage(file, targetTextareaId, fileInput);
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        processBase64Image(e.target.result, file.name, targetTextareaId, fileInput);
    };
    
    reader.onerror = function() {
        showUploadError('Erreur lors de la lecture du fichier.', fileInput);
    };
    
    // Lire le fichier en base64
    reader.readAsDataURL(file);
}

// Afficher un message de progression
function showUploadProgress(message, fileInput) {
    hideUploadMessages(fileInput);
    
    let progressDiv = fileInput.parentNode.querySelector('.upload-progress');
    if (!progressDiv) {
        progressDiv = document.createElement('div');
        progressDiv.className = 'upload-progress';
        fileInput.parentNode.appendChild(progressDiv);
    }
    
    progressDiv.textContent = message;
    progressDiv.classList.add('show');
}

// Afficher un message d'erreur
function showUploadError(message, fileInput) {
    hideUploadMessages(fileInput);
    
    let errorDiv = fileInput.parentNode.querySelector('.upload-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'upload-error';
        fileInput.parentNode.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    // Masquer l'erreur après 5 secondes
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

// Masquer tous les messages d'upload
function hideUploadMessages(fileInput) {
    const progressDiv = fileInput.parentNode.querySelector('.upload-progress');
    const errorDiv = fileInput.parentNode.querySelector('.upload-error');
    
    if (progressDiv) progressDiv.classList.remove('show');
    if (errorDiv) errorDiv.classList.remove('show');
}

// Redimensionner et traiter une image volumineuse
function resizeAndProcessImage(file, targetTextareaId, fileInput) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculer les nouvelles dimensions (max 1200px de largeur)
        const maxWidth = 1200;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convertir en base64 avec compression
        canvas.toBlob(function(blob) {
            if (blob) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    processBase64Image(e.target.result, file.name, targetTextareaId, fileInput);
                };
                reader.onerror = function() {
                    showUploadError('Erreur lors du redimensionnement de l\'image.', fileInput);
                };
                reader.readAsDataURL(blob);
            } else {
                showUploadError('Impossible de redimensionner l\'image.', fileInput);
            }
        }, 'image/jpeg', 0.8); // Compression JPEG à 80%
    };
    
    img.onerror = function() {
        showUploadError('Impossible de charger l\'image pour le redimensionnement.', fileInput);
    };
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Traiter les données base64 d'une image
function processBase64Image(base64Data, fileName, targetTextareaId, fileInput) {
    try {
        // Valider que les données base64 sont correctes
        if (!base64Data || !base64Data.startsWith('data:image/')) {
            throw new Error('Format de données invalide');
        }
        
        const fileNameClean = fileName.replace(/\.[^/.]+$/, ''); // Nom sans extension
        const imageMarkdown = `![${fileNameClean}](${base64Data} "${fileNameClean}")`;
        
        // Tester si l'image peut être chargée avant de l'insérer
        const testImg = new Image();
        testImg.onload = function() {
            // L'image est valide, l'insérer dans le textarea
            const textarea = document.getElementById(targetTextareaId);
            if (textarea) {
                const cursorPos = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursorPos);
                const textAfter = textarea.value.substring(cursorPos);
                
                // Ajouter des retours à la ligne si nécessaire
                const prefix = textBefore && !textBefore.endsWith('\n') ? '\n\n' : '';
                const suffix = textAfter && !textAfter.startsWith('\n') ? '\n\n' : '';
                
                textarea.value = textBefore + prefix + imageMarkdown + suffix + textAfter;
                
                // Repositionner le curseur après l'image
                const newPos = cursorPos + prefix.length + imageMarkdown.length + suffix.length;
                textarea.setSelectionRange(newPos, newPos);
                textarea.focus();
            }
            
            hideUploadMessages(fileInput);
            
            // Réinitialiser l'input file
            fileInput.value = '';
        };
        
        testImg.onerror = function() {
            showUploadError('L\'image traitée ne peut pas être affichée correctement.', fileInput);
        };
        
        testImg.src = base64Data;
        
    } catch (error) {
        showUploadError('Erreur lors du traitement de l\'image : ' + error.message, fileInput);
    }
}

// Afficher un dialog pour insérer une image locale
function showLocalImageDialog(targetTextareaId) {
    const fileName = prompt(
        'Nom du fichier image dans le dossier Figures :\n\n' +
        'Exemples :\n' +
        '• triangle.png\n' +
        '• geometrie/cercle.jpg\n' +
        '• schema-pythagore.png\n' +
        '• Pythagore1.png\n\n' +
        'Entrez le nom du fichier (sans caractères spéciaux) :'
    );
    
    if (fileName && fileName.trim()) {
        let cleanFileName = fileName.trim();
        
        // Nettoyer le nom de fichier pour éviter les problèmes d'encodage
        cleanFileName = cleanFileName.replace(/[<>:"'|?*]/g, ''); // Supprimer caractères interdits
        
        // Vérifier que le fichier a une extension d'image
        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
        const hasValidExtension = validExtensions.some(ext => 
            cleanFileName.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
            alert('Le fichier doit avoir une extension d\'image valide (.png, .jpg, .jpeg, .gif, .bmp, .webp, .svg)');
            return;
        }
        
        const description = prompt(
            'Description de l\'image (optionnel) :\n\n' +
            'Cette description sera utilisée comme texte alternatif.\n' +
            'Évitez les caractères spéciaux dans la description.'
        ) || cleanFileName.replace(/\.[^/.]+$/, '');
        
        // Nettoyer la description aussi
        const cleanDescription = description.replace(/[<>]/g, '').trim();
        
        const imageMarkdown = `![${cleanDescription}](./Figures/${cleanFileName})`;
        
        // Insérer dans le textarea
        const textarea = document.getElementById(targetTextareaId);
        if (textarea) {
            const cursorPos = textarea.selectionStart;
            const textBefore = textarea.value.substring(0, cursorPos);
            const textAfter = textarea.value.substring(cursorPos);
            
            // Ajouter des retours à la ligne si nécessaire
            const prefix = textBefore && !textBefore.endsWith('\n') ? '\n\n' : '';
            const suffix = textAfter && !textAfter.startsWith('\n') ? '\n\n' : '';
            
            textarea.value = textBefore + prefix + imageMarkdown + suffix + textAfter;
            
            // Repositionner le curseur après l'image
            const newPos = cursorPos + prefix.length + imageMarkdown.length + suffix.length;
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
        }
    }
}

// Fonction de test pour vérifier la structure des dossiers
function testFiguresFolder() {
    // Créer une image de test pour vérifier si le dossier Figures est accessible
    const testImg = new Image();
    const testFileName = 'test.png'; // Vous pouvez remplacer par un fichier existant
    
    testImg.onload = function() {
        console.log('✅ Le dossier Figures est accessible et l\'image de test se charge correctement.');
    };
    
    testImg.onerror = function() {
        console.log('❌ Problème d\'accès au dossier Figures ou fichier de test inexistant.');
        console.log('Structure attendue :');
        console.log('📁 Votre dossier/');
        console.log('├── 📄 index.html');
        console.log('└── 📁 Figures/');
        console.log('    └── 🖼️ vos_images.png');
    };
    
    testImg.src = './Figures/' + testFileName;
}

// Fonctions d'export/import
function exportCards() {
    try {
        // Créer l'objet d'export avec métadonnées
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            appName: "Révisions Maths",
            mathCards: mathCards,
            favorites: favorites
        };
        
        // Convertir en JSON avec indentation
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Créer le fichier et le télécharger
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `revisions-maths-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Nettoyer l'URL
        URL.revokeObjectURL(url);
        
        // Message de confirmation
        alert('Export réussi ! Le fichier a été téléchargé.');
        
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        alert('Erreur lors de l\'export. Vérifiez la console pour plus de détails.');
    }
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vérifier que c'est un fichier JSON
    if (!file.name.toLowerCase().endsWith('.json')) {
        alert('Veuillez sélectionner un fichier JSON valide.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            showImportPreview(importData);
        } catch (error) {
            alert('Erreur : Le fichier JSON est invalide ou corrompu.');
            console.error('Erreur de parsing JSON:', error);
        }
    };
    
    reader.onerror = function() {
        alert('Erreur lors de la lecture du fichier.');
    };
    
    reader.readAsText(file);
    
    // Réinitialiser l'input
    event.target.value = '';
}

function showImportPreview(importData) {
    // Détecter le format des données (nouveau format avec mathCards ou ancien format direct)
    const cardsData = importData.mathCards || importData;
    
    // Valider la structure des données
    if (!cardsData || typeof cardsData !== 'object') {
        alert('Erreur : Le fichier ne contient pas de données de fiches valides.');
        return;
    }
    
    // Compter les fiches par niveau
    let totalCards = 0;
    const levelStats = {};
    
    Object.keys(cardsData).forEach(level => {
        const cards = cardsData[level];
        if (Array.isArray(cards)) {
            levelStats[level] = cards.length;
            totalCards += cards.length;
        }
    });
    
    if (totalCards === 0) {
        alert('Le fichier ne contient aucune fiche à importer.');
        return;
    }
    
    // Afficher l'aperçu
    const modal = document.getElementById('importModal');
    const preview = document.getElementById('importPreview');
    const stats = document.getElementById('importStats');
    const confirmBtn = document.getElementById('confirmImport');
    
    // Générer les statistiques
    let statsHTML = '<h5>📊 Contenu du fichier :</h5><ul>';
    statsHTML += `<li><strong>Total :</strong> ${totalCards} fiche(s)</li>`;
    
    Object.keys(levelStats).forEach(level => {
        const levelName = getLevelDisplayName(level);
        statsHTML += `<li><strong>${levelName} :</strong> ${levelStats[level]} fiche(s)</li>`;
    });
    
    if (importData.favorites && Array.isArray(importData.favorites)) {
        statsHTML += `<li><strong>Favoris :</strong> ${importData.favorites.length} fiche(s)</li>`;
    }
    
    if (importData.exportDate) {
        const date = new Date(importData.exportDate).toLocaleDateString('fr-FR');
        statsHTML += `<li><strong>Date d'export :</strong> ${date}</li>`;
    }
    
    statsHTML += '</ul>';
    stats.innerHTML = statsHTML;
    
    // Stocker les données pour l'import
    window.pendingImportData = importData;
    
    // Afficher le modal
    preview.style.display = 'block';
    confirmBtn.style.display = 'inline-block';
    modal.style.display = 'flex';
}

function performImport() {
    if (!window.pendingImportData) {
        alert('Aucune donnée à importer.');
        return;
    }
    
    try {
        const importData = window.pendingImportData;
        const mode = document.querySelector('input[name="importMode"]:checked').value;
        
        // Extraire les données dans le bon format
        const cardsData = importData.mathCards || importData;
        
        if (mode === 'replace') {
            // Remplacer toutes les données
            mathCards = cardsData;
            favorites = importData.favorites || [];
        } else {
            // Fusionner les données
            Object.keys(cardsData).forEach(level => {
                if (!mathCards[level]) {
                    mathCards[level] = [];
                }
                mathCards[level] = mathCards[level].concat(cardsData[level] || []);
            });
            
            if (importData.favorites && Array.isArray(importData.favorites)) {
                // Éviter les doublons dans les favoris
                importData.favorites.forEach(fav => {
                    if (!favorites.includes(fav)) {
                        favorites.push(fav);
                    }
                });
            }
        }
        
        // Sauvegarder dans localStorage
        saveCards();
        localStorage.setItem('mathsFavorites', JSON.stringify(favorites));
        
        // Recharger l'affichage
        loadSavedCards();
        loadFavorites();
        
        // Fermer le modal
        closeImportModal();
        
        // Message de confirmation
        alert('Import réussi ! Vos fiches ont été importées.');
        
        // Nettoyer
        window.pendingImportData = null;
        
    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        alert('Erreur lors de l\'import. Vérifiez la console pour plus de détails.');
    }
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    const preview = document.getElementById('importPreview');
    const confirmBtn = document.getElementById('confirmImport');
    
    modal.style.display = 'none';
    preview.style.display = 'none';
    confirmBtn.style.display = 'none';
    
    // Nettoyer les données temporaires
    window.pendingImportData = null;
}

function initializeImportModal() {
    const modal = document.getElementById('importModal');
    const closeBtn = document.getElementById('closeImportModal');
    const cancelBtn = document.getElementById('cancelImport');
    const confirmBtn = document.getElementById('confirmImport');
    
    // Fermer le modal
    closeBtn.addEventListener('click', closeImportModal);
    cancelBtn.addEventListener('click', closeImportModal);
    
    // Confirmer l'import
    confirmBtn.addEventListener('click', performImport);
    
    // Fermer en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeImportModal();
        }
    });
}

// Initialisation de la modal d'édition
function initializeEditModal() {
    const modal = document.getElementById('editCardModal');
    const closeBtn = document.getElementById('closeEditModal');
    const cancelBtn = document.getElementById('cancelEditCard');
    const form = document.getElementById('editCardForm');
    
    // Fermer la modal
    closeBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    
    // Fermer en cliquant à l'extérieur
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeEditModal();
        }
    });
    
    // Soumettre le formulaire d'édition
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateCardFromForm();
    });
    
    // Gestion du nombre d'exercices pour l'édition
    const editExerciseCountSelect = document.getElementById('editExerciseCount');
    const editExercisesContainer = document.getElementById('editExercisesContainer');
    
    editExerciseCountSelect.addEventListener('change', function() {
        const count = parseInt(this.value);
        updateExerciseFields(count, editExercisesContainer, 'edit');
    });
    
    // Ajouter la prévisualisation pour les champs d'édition
    addPreviewToTextarea(document.getElementById('editCardFormulas'));
    addPreviewToTextarea(document.getElementById('editCardExamples'));
}

function editCard(card) {
    // Trouver la fiche correspondante dans les données sauvegardées
    const cardTitle = card.querySelector('h3').textContent;
    
    // Déterminer le niveau et l'index de la carte
    let foundData = null;
    let foundLevel = '';
    let foundIndex = -1;
    
    Object.keys(mathCards).forEach(level => {
        if (mathCards[level]) {
            mathCards[level].forEach((cardData, index) => {
                if (cardData.title === cardTitle) {
                    foundData = cardData;
                    foundLevel = level;
                    foundIndex = index;
                }
            });
        }
    });
    
    if (!foundData) {
        alert('Impossible de trouver les données de cette fiche.');
        return;
    }
    
    // Stocker les informations d'édition
    currentEditingCard = card;
    currentEditingIndex = foundIndex;
    currentEditingLevel = foundLevel;
    
    // Pré-remplir le formulaire d'édition
    document.getElementById('editCardLevel').value = foundLevel;
    document.getElementById('editCardTitle').value = foundData.title;
    document.getElementById('editCardFormulas').value = foundData.formulas || '';
    document.getElementById('editCardExamples').value = foundData.examples || '';
    
    // Gérer les exercices
    const exerciseCount = foundData.exercises ? foundData.exercises.length : 0;
    document.getElementById('editExerciseCount').value = exerciseCount;
    
    // Créer les champs d'exercices
    const editExercisesContainer = document.getElementById('editExercisesContainer');
    updateExerciseFields(exerciseCount, editExercisesContainer, 'edit');
    
    // Remplir les exercices existants
    if (foundData.exercises) {
        foundData.exercises.forEach((exercise, index) => {
            const i = index + 1;
            const statementField = document.getElementById(`editExercise${i}Statement`);
            const solutionField = document.getElementById(`editExercise${i}Solution`);
            
            if (statementField) statementField.value = exercise.statement || '';
            if (solutionField) solutionField.value = exercise.solution || '';
        });
    }
    
    // Afficher la modal
    document.getElementById('editCardModal').style.display = 'block';
    
    // Focus sur le premier champ
    setTimeout(() => {
        document.getElementById('editCardTitle').focus();
    }, 100);
}

function closeEditModal() {
    const modal = document.getElementById('editCardModal');
    modal.style.display = 'none';
    
    // Réinitialiser les variables d'édition
    currentEditingCard = null;
    currentEditingIndex = -1;
    currentEditingLevel = '';
    
    // Réinitialiser le formulaire
    document.getElementById('editCardForm').reset();
    document.getElementById('editExercisesContainer').innerHTML = '';
    document.getElementById('editExercisesContainer').style.display = 'none';
}

function updateExerciseFields(count, container, prefix = '') {
    // Sauvegarder le contenu existant avant de vider le conteneur
    const existingData = {};
    const idPrefix = prefix ? `${prefix}Exercise` : 'exercise';
    
    // Récupérer les données existantes
    for (let i = 1; i <= 10; i++) { // Vérifier jusqu'à 10 exercices possibles
        const statementField = document.getElementById(`${idPrefix}${i}Statement`);
        const solutionField = document.getElementById(`${idPrefix}${i}Solution`);
        
        if (statementField || solutionField) {
            existingData[i] = {
                statement: statementField ? statementField.value : '',
                solution: solutionField ? solutionField.value : ''
            };
        }
    }
    
    container.innerHTML = '';
    
    if (count === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    for (let i = 1; i <= count; i++) {
        const exerciseBlock = document.createElement('div');
        exerciseBlock.className = 'exercise-block';
        
        exerciseBlock.innerHTML = `
            <h4><i class="fas fa-pencil-alt"></i> Exercice ${i}</h4>
            <div class="form-group">
                <label for="${idPrefix}${i}Statement">Énoncé de l'exercice ${i}</label>
                <textarea id="${idPrefix}${i}Statement" placeholder="Énoncé de l'exercice avec formules LaTeX si nécessaire"></textarea>
                <small class="form-help"><strong>Formatage :</strong> **gras**, *italique*, ++souligné++, ==surligné==, \`code\` + LaTeX</small>
                <div class="image-help">
                    <strong>Images :</strong> <code>![Description](./Figures/image.png)</code><br>
                    <button type="button" class="btn-insert-local" data-target="${idPrefix}${i}Statement">
                        <i class="fas fa-folder"></i> Figures
                    </button>
                    <button type="button" class="btn-upload-image" data-target="${idPrefix}${i}Statement">
                        <i class="fas fa-upload"></i> Upload
                    </button>
                    <input type="file" class="image-file-input" accept="image/*" style="display: none;">
                </div>
            </div>
            <div class="form-group">
                <label for="${idPrefix}${i}Solution">Correction de l'exercice ${i}</label>
                <textarea id="${idPrefix}${i}Solution" placeholder="Solution détaillée avec étapes et calculs"></textarea>
                <small class="form-help"><strong>Formatage :</strong> **gras**, *italique*, ++souligné++, ==surligné==, \`code\` + LaTeX</small>
                <div class="image-help">
                    <strong>Images :</strong> <code>![Description](./Figures/image.png)</code><br>
                    <button type="button" class="btn-insert-local" data-target="${idPrefix}${i}Solution">
                        <i class="fas fa-folder"></i> Figures
                    </button>
                    <button type="button" class="btn-upload-image" data-target="${idPrefix}${i}Solution">
                        <i class="fas fa-upload"></i> Upload
                    </button>
                    <input type="file" class="image-file-input" accept="image/*" style="display: none;">
                </div>
            </div>
        `;
        
        container.appendChild(exerciseBlock);
        
        // Restaurer les données existantes si elles existent
        const statementTextarea = exerciseBlock.querySelector(`#${idPrefix}${i}Statement`);
        const solutionTextarea = exerciseBlock.querySelector(`#${idPrefix}${i}Solution`);
        
        if (existingData[i]) {
            statementTextarea.value = existingData[i].statement;
            solutionTextarea.value = existingData[i].solution;
        }
        
        // Ajouter la prévisualisation pour chaque textarea
        addPreviewToTextarea(statementTextarea);
        addPreviewToTextarea(solutionTextarea);
    }
}

function updateCardFromForm() {
    const level = document.getElementById('editCardLevel').value;
    const title = document.getElementById('editCardTitle').value.trim();
    const formulas = document.getElementById('editCardFormulas').value.trim();
    const examples = document.getElementById('editCardExamples').value.trim();
    const exerciseCount = parseInt(document.getElementById('editExerciseCount').value);
    
    if (!level || !title) {
        alert('Veuillez remplir au moins le niveau et le titre.');
        return;
    }
    
    // Récupérer les exercices modifiés
    const exercises = [];
    for (let i = 1; i <= exerciseCount; i++) {
        const statement = document.getElementById(`editExercise${i}Statement`)?.value.trim() || '';
        const solution = document.getElementById(`editExercise${i}Solution`)?.value.trim() || '';
        
        if (statement || solution) {
            exercises.push({
                id: i,
                statement: statement,
                solution: solution
            });
        }
    }
    
    // Créer les nouvelles données de la carte
    const updatedCardData = {
        title: title,
        formulas: formulas,
        examples: examples,
        exercises: exercises,
        timestamp: Date.now()
    };
    
    // Mettre à jour dans le localStorage
    if (currentEditingIndex >= 0 && mathCards[currentEditingLevel]) {
        // Si le niveau a changé, on doit déplacer la carte
        if (level !== currentEditingLevel) {
            // Supprimer de l'ancien niveau
            mathCards[currentEditingLevel].splice(currentEditingIndex, 1);
            
            // Ajouter au nouveau niveau
            if (!mathCards[level]) mathCards[level] = [];
            mathCards[level].push(updatedCardData);
            
            // Supprimer les anciennes cartes
            removeCardFromAllTabs(currentEditingLevel, currentEditingIndex);
        } else {
            // Même niveau, juste mettre à jour
            mathCards[level][currentEditingIndex] = updatedCardData;
            
            // Supprimer les anciennes cartes
            removeCardFromAllTabs(level, currentEditingIndex);
        }
        
        saveCards();
    }
    
    // Créer les nouvelles cartes
    const ficheCard = createFicheCard(title, formulas, examples);
    const exerciceCard = createExerciceCard(title, exercises);
    const correctionCard = createCorrectionCard(title, exercises);
    
    // Ajouter les nouvelles cartes aux bons sous-onglets
    const ficheGrid = document.querySelector(`#${level}-fiches .cards-grid`);
    const exerciceGrid = document.querySelector(`#${level}-exercices .cards-grid`);
    const correctionGrid = document.querySelector(`#${level}-corrections .cards-grid`);
    
    ficheGrid.appendChild(ficheCard);
    exerciceGrid.appendChild(exerciceCard);
    correctionGrid.appendChild(correctionCard);
    
    // Ajouter les événements aux nouvelles cartes
    addEventListenersToCard(ficheCard);
    addEventListenersToCard(exerciceCard);
    addEventListenersToCard(correctionCard);
    
    // Passer au bon onglet si nécessaire
    if (level !== currentTab) {
        switchTab(level);
    } else {
        // Aller au sous-onglet Fiches pour voir la carte modifiée
        switchSubTab(level, `${level}-fiches`);
    }
    
    // Fermer la modal
    closeEditModal();
    
    showNotification('Fiche modifiée avec succès !');
    
    // Faire défiler vers la carte modifiée
    setTimeout(() => {
        ficheCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Re-render MathJax pour les nouvelles cartes
        renderMathJax(ficheCard);
        renderMathJax(exerciceCard);
        renderMathJax(correctionCard);
    }, 300);
}

function removeCardFromAllTabs(level, index) {
    // Supprimer les cartes existantes des trois sous-onglets
    const ficheGrid = document.querySelector(`#${level}-fiches .cards-grid`);
    const exerciceGrid = document.querySelector(`#${level}-exercices .cards-grid`);
    const correctionGrid = document.querySelector(`#${level}-corrections .cards-grid`);
    
    if (ficheGrid && ficheGrid.children[index]) {
        ficheGrid.removeChild(ficheGrid.children[index]);
    }
    if (exerciceGrid && exerciceGrid.children[index]) {
        exerciceGrid.removeChild(exerciceGrid.children[index]);
    }
    if (correctionGrid && correctionGrid.children[index]) {
        correctionGrid.removeChild(correctionGrid.children[index]);
    }
}

// Fonction pour basculer l'affichage des corrections par ID
function toggleCorrectionById(correctionId, headerElement) {
    const correctionContent = document.getElementById(correctionId);
    const toggleIcon = headerElement.querySelector('.toggle-icon');
    
    if (!correctionContent) return;
    
    if (correctionContent.style.display === 'none') {
        // Afficher la correction
        correctionContent.style.display = 'block';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-up');
        
        // Animation d'apparition
        correctionContent.style.opacity = '0';
        correctionContent.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            correctionContent.style.transition = 'all 0.3s ease';
            correctionContent.style.opacity = '1';
            correctionContent.style.transform = 'translateY(0)';
        }, 10);
        
        // Re-render MathJax pour cette correction
        if (window.MathJax) {
            MathJax.typesetPromise([correctionContent]).catch(function (err) {
                console.log('MathJax error:', err.message);
            });
        }
    } else {
        // Masquer la correction
        correctionContent.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-up');
        toggleIcon.classList.add('fa-chevron-down');
    }
}

// Fonction pour basculer l'affichage des corrections (compatibilité)
function toggleCorrection(exerciseId, headerElement) {
    const correctionContent = headerElement.parentNode.querySelector('.correction-content');
    const toggleIcon = headerElement.querySelector('.toggle-icon');
    
    if (correctionContent.style.display === 'none') {
        // Afficher la correction
        correctionContent.style.display = 'block';
        toggleIcon.classList.remove('fa-chevron-down');
        toggleIcon.classList.add('fa-chevron-up');
        
        // Animation d'apparition
        correctionContent.style.opacity = '0';
        correctionContent.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            correctionContent.style.transition = 'all 0.3s ease';
            correctionContent.style.opacity = '1';
            correctionContent.style.transform = 'translateY(0)';
        }, 10);
        
        // Re-render MathJax pour cette correction
        if (window.MathJax) {
            MathJax.typesetPromise([correctionContent]).catch(function (err) {
                console.log('MathJax error:', err.message);
            });
        }
    } else {
        // Masquer la correction
        correctionContent.style.display = 'none';
        toggleIcon.classList.remove('fa-chevron-up');
        toggleIcon.classList.add('fa-chevron-down');
    }
}