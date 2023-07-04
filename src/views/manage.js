/*-----------*\
  GUI HELPERS
\*-----------*/
const getActiveTable = () =>
    document.querySelector('#table-selector input:checked').value;
const clearDataRows = () => {
    while (dataTable.lastChild) dataTable.lastChild.remove();
};

// Pagination things
const getCurrentPage = () => {
    const userInput = pageCurrElement.textContent;
    const inputValid = /\d+/.test(userInput);
    if (!inputValid) {
        pageCurrElement.textContent = '1';
        return 1;
    } else {
        return Number(userInput);
    }
};
const getCurrentRecordsPerPage = () =>
    document.getElementById('records-per-page').value;
const setPaginationTotal = (totalCount) => {
    const totalPages = Math.ceil(totalCount / getCurrentRecordsPerPage());
    pageTotalElement.textContent = totalPages;
};

/*----------*\
  UNDO STACK
\*----------*/
const undoStack = [];
var undoDraft;
const createUndoDraft = ({target}) => {
    undoDraft = target.innerText || target.value;
};
const removeUndoDraft = () => (undoDraft = null);
const addUndoState = (state) => {
    undoStack.push(state);
    document.getElementById('undo').classList.remove('disabled');
};
const clearUndoStack = () => {
    undoStack.splice(0, undoStack.length);
    undoDraft = null;
};
const restoreUndoState = () => {
    const activeTable = getActiveTable();
    if (activeTable === 'authors') restoreAuthorUndoState();
    if (activeTable === 'guesses') restoreGuessUndoState();
    if (activeTable === 'suggestions') restoreSuggestionUndoState();
};

/*------------------*\
  GUI Event Handlers
\*------------------*/
// Table selection things
const changeTable = () => {
    // Clear things that change per table
    document.getElementById('merge-button').classList.add('disabled');
    clearDataRows();
    clearSearch();
    clearUndoStack();

    // Update page
    const activeTable = getActiveTable();
    if (activeTable === 'authors') loadAuthors();
    if (activeTable === 'guesses') loadGuesses();
    if (activeTable === 'suggestions') loadSuggestions();
};

// Search things
const showSearch = (event) => {
    const searchEl = document.getElementById('search-input');
    searchEl.classList.add('expanded');
    searchEl.focus();
    event.stopPropagation();

    document.addEventListener('click', hideSearch);
};
const hideSearch = ({target}) => {
    if (target.id !== 'search-input') {
        document.getElementById('search-input').classList.remove('expanded');
        document.removeEventListener('click', hideSearch);
    }
};
const clearSearch = () => {
    document.getElementById('search-input').value = '';
    document.getElementById('search-input').classList.remove('expanded');
    document.getElementById('search-button').classList.remove('active');
};
const performSearch = () => {
    const searchEl = document.getElementById('search-input');
    const searchString = searchEl.value.trim().toLowerCase();
    console.log({searchString});

    const activeTable = getActiveTable();
    if (activeTable === 'authors') performAuthorSearch(searchString);
    if (activeTable === 'guesses') performGuessSearch(searchString);
    // if (activeTable === 'suggestions') loadSuggestions(searchString);
};

// Pagination text
const pageCurrFocus = () => {
    const pageCurrRange = document.createRange();
    pageCurrRange.selectNodeContents(pageCurrElement);

    const windowSelection = window.getSelection();
    windowSelection.removeAllRanges();
    windowSelection.addRange(pageCurrRange);
};
const pageCurrInput = (event) => {
    if (event.keyCode === 13) {
        // Enter was pressed, don't add a newline
        event.preventDefault();

        // Unfocus this element, handle input
        pageCurrElement.blur();

        // Deselect element
        const windowSelection = window.getSelection();
        windowSelection.removeAllRanges();
    }
};

// Pagination buttons
const loadFirstPage = () => {
    pageCurrElement.textContent = '1';
    loadAuthors();
};
const decrementPage = () => {
    const currentPage = pageCurrElement.textContent;
    const newPage = Number(currentPage) - 1;
    pageCurrElement.textContent = Math.max(newPage, 1);
    loadAuthors();
};
const incrementPage = () => {
    const currentPage = pageCurrElement.textContent;
    const newPage = Number(currentPage) + 1;
    const maxPage = Number(pageTotalElement.textContent);
    pageCurrElement.textContent = Math.min(newPage, maxPage);
    loadAuthors();
};
const loadLastPage = () => {
    pageCurrElement.textContent = pageTotalElement.textContent;
    loadAuthors();
};

/*---------------------*\
  "On Load" Preparation
\*---------------------*/
let dataTable;
let pageCurrElement, pageTotalElement;
document.addEventListener('DOMContentLoaded', () => {
    // Save common elements
    dataTable = document.getElementById('data-table');

    pageCurrElement = document.getElementById('page-curr');
    pageTotalElement = document.getElementById('page-total');

    // Set event listeners
    document
        .getElementById('search-button')
        .addEventListener('click', showSearch);
    pageCurrElement.addEventListener('keydown', pageCurrInput);

    // Load initial data
    changeTable();
});
