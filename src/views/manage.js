/*---*\
  API
\*---*/
const getAuthors = async (offset, limit) => {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    const response = await fetch(`/api/authors?${params}`)
    return response.json();
};
const updateCallsign = (author) =>
    fetch(`/api/authors/callsign`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(author),
    });
const updateNotes = (author) =>
    fetch(`/api/authors/notes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(author),
    });

/*------------*\
  GUI BUILDERS
\*------------*/
const getSocialElement = (username, displayName) => {
    const socialElement = document.createElement('div');

    const iconEl = document.createElement('div');
    iconEl.classList.add('icon');
    socialElement.append(iconEl);

    const usernameEl = document.createElement('div');
    usernameEl.classList.add('username');
    usernameEl.textContent = username ? '@' + username : '';
    socialElement.append(usernameEl);

    const dividerElement = document.createElement('div');
    dividerElement.classList.add('social-divider');
    socialElement.append(dividerElement);

    const displayNameEl = document.createElement('div');
    displayNameEl.classList.add('display-name');
    displayNameEl.textContent = displayName;
    socialElement.append(displayNameEl);

    return socialElement;
};
const addAuthorRow = ({
    authorId,
    callsign,
    username,
    displayName,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    notes,
}) => {
    // Row container
    const rolodex = document.createElement('div');
    rolodex.classList.add('rolodex');
    rolodex.dataset.authorId = authorId;

    // Callsign box
    const callsignContainerEl = document.createElement('div');
    callsignContainerEl.classList.add('callsign');
    rolodex.append(callsignContainerEl);

    const idElement = document.createElement('p');
    idElement.textContent = '#' + authorId;
    callsignContainerEl.append(idElement);

    const callsignEl = document.createElement('p');
    callsignEl.dataset.authorId = authorId;
    callsignEl.textContent = callsign;
    callsignEl.contentEditable = true;
    callsignEl.addEventListener('focus', createUndoDraft);
    callsignEl.addEventListener('blur', callsignBlur);
    callsignContainerEl.append(callsignEl);
    
    const editPopupEl = document.createElement("span");
    editPopupEl.classList.add("edit-icon")
    editPopupEl.addEventListener("click", showEditPopup);
    callsignContainerEl.append(editPopupEl)

    // Socials box
    const socialsElement = document.createElement('div');
    socialsElement.classList.add('socials');
    rolodex.append(socialsElement);

    const discordEl = getSocialElement(username, displayName);
    discordEl.classList.add('discord');
    socialsElement.append(discordEl);

    const twitterEl = getSocialElement(twitterUsername, twitterDisplayName);
    twitterEl.classList.add('twitter');
    socialsElement.append(twitterEl);

    const emailEl = getSocialElement(emailAddress, emailName);
    emailEl.classList.add('email');
    socialsElement.append(emailEl);

    // Notes box
    const notesEl = document.createElement('textarea');
    notesEl.classList.add('notes');
    notesEl.placeholder = 'No listener notes yet...';
    notesEl.value = notes;
    notesEl.addEventListener('focus', createUndoDraft);
    notesEl.addEventListener('blur', notesBlur);
    rolodex.append(notesEl);

    document.getElementById('data-table').append(rolodex);
};
const clearDataRows = () => {
    const dataTable = document.getElementById('data-table');
    while (dataTable.lastChild) dataTable.lastChild.remove();
};

/*-----------*\
  GUI HELPERS
\*-----------*/
let pageCurrElement, pageTotalElement;
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
    undoDraft = target.innerText || target.value
};
const removeUndoDraft = () => (undoDraft = null);
const addUndoState = (state) => {
    undoStack.push(state);
    document.getElementById("undo").classList.remove('disabled');
}
const restoreUndoState = () => {
    // Get most recent state
    const state = undoStack.pop();
    const rolodex = document.querySelector(`.author-${state.authorId}`);
    
    // Perform update actions
    if (state.callsign) {
        // Update server
        updateCallsign(state);
        
        // Update GUI
        const callsignEl = rolodex.querySelector(".callsign [contenteditable]");
        callsignEl.innerText = state.callsign;
    } else if (state.notes) {
        // Update server
        updateNotes(state);
        
        // Update GUI
        const notesEl = rolodex.querySelector(".notes");
        notesEl.value = state.notes;
    }
    
    // Update undo button
    if (!undoStack.length) {
        document.getElementById("undo").classList.add('disabled');
    }
}

/*------------------*\
  GUI Event Handlers
\*------------------*/
const loadAuthors = async () => {
    // Assemble request params
    const currentPage = getCurrentPage();
    const limit = getCurrentRecordsPerPage();
    const offset = limit * (currentPage - 1);

    // Send request
    const {authors, count} = await getAuthors(offset, limit);

    // Update page
    clearDataRows();
    authors.forEach(addAuthorRow);
    setPaginationTotal(count);
};

const showEditPopup = ({target})=>{
    target.classList.remove(".hidden")
}

// Data editing
const callsignBlur = ({target}) => {
    // Collect data
    const callsign = target.innerText;
    const authorId = target.closest(".rolodex").dataset.authorId;

    if (callsign !== undoDraft) {
        console.log('sending update');
        updateCallsign({authorId, callsign});
        addUndoState({authorId, callsign: undoDraft});
    }
    
    // Clear draft
    removeUndoDraft();
};
const notesBlur = ({target}) => {
    // Collect data
    const notes = target.value;
    const authorId = target.closest(".rolodex").dataset.authorId;

    if (notes !== undoDraft) {
        console.log('sending update');
        updateNotes({authorId, notes});
        addUndoState({authorId, notes: undoDraft});
    }
    
    // Clear draft
    removeUndoDraft();
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

document.addEventListener('DOMContentLoaded', () => {
    // Save common elements
    pageCurrElement = document.getElementById('page-curr');
    pageTotalElement = document.getElementById('page-total');

    // Set event listeners
    pageCurrElement.addEventListener('keydown', pageCurrInput);

    // Fetch and display first page
    loadAuthors();
});
