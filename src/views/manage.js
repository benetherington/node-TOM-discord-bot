/*---*\
  API
\*---*/
const getAuthors = async (offset, limit) => {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    const response = await fetch(`/api/authors?${params}`);
    return response.json();
};
const getAuthor = async (authorId) => {
    const result = await fetch(`/api/author/${authorId}`);
    try {
        return await result.json();
    } catch (SyntaxError) {
        return null;
    }
};
const updateCallsign = (author) =>
    fetch('/api/authors/callsign', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(author),
    });
const updateNotes = (author) =>
    fetch('/api/authors/notes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(author),
    });
const previewMerge = (authorKeep, authorDelete) =>
    fetch('/api/authors/merge/preview', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({authorKeep, authorDelete}),
    });
const executeMerge = (authorKeep, authorDelete) =>
    fetch('/api/authors/merge/execute', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({authorKeep, authorDelete}),
    });

/*------------*\
  GUI BUILDERS
\*------------*/
const buildSocialElement = (username, displayName) => {
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
const buildAuthorRow = (
    {
        authorId,
        callsign,
        username,
        displayName,
        twitterUsername,
        twitterDisplayName,
        emailAddress,
        emailName,
        notes,
    },
    editable = true,
) => {
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
    if (editable) {
        callsignEl.contentEditable = true;
        callsignEl.addEventListener('focus', createUndoDraft);
        callsignEl.addEventListener('blur', callsignBlur);
    }
    callsignContainerEl.append(callsignEl);

    // Socials box
    const socialsElement = document.createElement('div');
    socialsElement.classList.add('socials');
    rolodex.append(socialsElement);

    const discordEl = buildSocialElement(username, displayName);
    discordEl.classList.add('discord');
    socialsElement.append(discordEl);

    const twitterEl = buildSocialElement(twitterUsername, twitterDisplayName);
    twitterEl.classList.add('twitter');
    socialsElement.append(twitterEl);

    const emailEl = buildSocialElement(emailAddress, emailName);
    emailEl.classList.add('email');
    socialsElement.append(emailEl);

    // Notes box
    const notesEl = document.createElement('textarea');
    notesEl.classList.add('notes');
    notesEl.placeholder = 'No listener notes yet...';
    notesEl.value = notes;
    if (editable) {
        notesEl.addEventListener('focus', createUndoDraft);
        notesEl.addEventListener('blur', notesBlur);
    } else {
        notesEl.disabled = true;
    }
    rolodex.append(notesEl);

    return rolodex;
};

/*-----------*\
  GUI HELPERS
\*-----------*/
// Rolodex things
const addAuthorRow = (author) => {
    const rolodex = buildAuthorRow(author);
    dataTable.append(rolodex);
};
const clearDataRows = () => {
    while (dataTable.lastChild) dataTable.lastChild.remove();
};

// Search things
const getMatchingRolodae = (searchString) => {
    const rolodae = Array.from(document.querySelectorAll('.rolodex'));
    const passAndFail = rolodae.reduce(
        ([pass, fail], rolo) =>
            rolo.innerText.toLowerCase().includes(searchString)
                ? [[...pass, rolo], fail] // add rolodex to pass list
                : [pass, [...fail, rolo]], // add rolodex to fail list
        [[],[]] // start with empty pass/fail arrays
    );
    return passAndFail;
};
const hiddenWrap = (toWrap) => {
    // Check that this element is not yet wrapped
    if (toWrap.parentElement.classList.contains('hidden-wrapper')) return;
    // Create wrapper
    const hiddenWrapper = document.createElement('span');
    hiddenWrapper.classList.add('hidden', 'hidden-wrapper');
    // Wrap element
    toWrap.replaceWith(hiddenWrapper);
    hiddenWrapper.appendChild(toWrap);
};
const hiddenUnwrap = (toUnwrap) => {
    // Check this element is actually wrapped
    if (!toUnwrap.parentElement.classList.contains('hidden-wrapper')) return;
    // Unwrap element
    toUnwrap.parentElement.replaceWith(toUnwrap);
};

// Merge modal things
const showValidMergeInput = async (inputElement, callsign) => {
    // Update input
    inputElement.classList.remove('invalid');

    // Update label
    const labelElement = inputElement.previousElementSibling;
    labelElement.textContent = callsign || 'Author ID';
};
const showInvalidMergeInput = (inputElement) => {
    // Update input
    inputElement.classList.add('invalid');

    // Update label
    const labelElement = inputElement.previousElementSibling;
    labelElement.textContent = 'Author ID';

    // Clear preview
    clearMergePreview();
};
const clearMergePreview = () => {
    // Empty preview container
    const rolodexContainer = document.getElementById('merge-rolodex-container');
    while (rolodexContainer.lastChild) rolodexContainer.lastChild.remove();

    // Reset buttons
    mergePreviewElement.classList.remove('hidden');
    document.getElementById('merge-do').classList.add('hidden');
};
const displayMergePreview = async (previewPromise) => {
    // Fetch preview data
    const previewResponse = await previewPromise;
    const mergedAuthor = await previewResponse.json();

    // Make sure preview area is clear
    const rolodexContainer = document.getElementById('merge-rolodex-container');
    while (rolodexContainer.lastChild) rolodexContainer.lastChild.remove();

    // Create and display new preview
    const mergedRolodex = buildAuthorRow(mergedAuthor, false);
    rolodexContainer.append(mergedRolodex);
};
const findCallsignFromInput = async (authorInputElement) => {
    // See if we already have this author's information
    const authorId = authorInputElement.value;
    const rolodexEl = document.querySelector(
        `.rolodex[data-author-id="${authorId}"]`,
    );
    if (rolodexEl)
        return rolodexEl.querySelector('p[contentEditable]').textContent;

    // Nope, we don't have it, go fetch it
    const author = await getAuthor(authorId);
    if (author) return author.callsign;
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
const restoreUndoState = () => {
    // Get most recent state
    const state = undoStack.pop();
    const rolodex = document.querySelector(`.author-${state.authorId}`);

    // Perform update actions
    if (state.callsign) {
        // Update server
        updateCallsign(state);

        // Update GUI
        const callsignEl = rolodex.querySelector('.callsign [contenteditable]');
        callsignEl.innerText = state.callsign;
    } else if (state.notes) {
        // Update server
        updateNotes(state);

        // Update GUI
        const notesEl = rolodex.querySelector('.notes');
        notesEl.value = state.notes;
    }

    // Update undo button
    if (!undoStack.length) {
        document.getElementById('undo').classList.add('disabled');
    }
};

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

// Search things
const showSearch = (event) => {
    const searchEl = document.getElementById('search-input');
    searchEl.classList.add('expanded');
    searchEl.focus();
    event.stopPropagation();

    document.addEventListener('click', ({target}) => {
        if (target.id !== 'search-input') {
            searchEl.classList.remove('expanded');
        }
    });
};
const performSearch = () => {
    const searchEl = document.getElementById('search-input');
    const searchString = searchEl.value.trim().toLowerCase();
    console.log({searchString});

    const [yesMatch, notMatch] = getMatchingRolodae(searchString);
    if (yesMatch.length) {
        // Hide/show not/matching elements
        yesMatch.forEach(hiddenUnwrap);
        notMatch.forEach(hiddenWrap);
        // Update search button
        document.getElementById('search-button').classList.add('active');
    } else {
        // Show all elements
        notMatch.forEach(hiddenUnwrap)
        // Update search button
        document.getElementById('search-button').classList.remove('active');
    }
};

// Merge modal things
const showMergeModal = (event) => {
    // Un-hide edit modal
    const mergeModal = document.getElementById('merge');
    mergeModal.classList.remove('hidden');

    // Close the modal when losing focus
    event.stopPropagation();
    document.addEventListener('click', ({target}) => {
        if (!target.closest('#merge')) mergeModal.classList.add('hidden');
    });
};
const validateMergeInputs = async () => {
    // Start with a clean slate
    clearMergePreview();

    // Check inputs make sense
    let keepValid = /^\d{1,3}$/.test(authorKeepElement.value);
    let deleteValid = /^\d{1,3}$/.test(authorDeleteElement.value);
    if (authorKeepElement.value === authorDeleteElement.value)
        keepValid = deleteValid = false;

    // Check inputs mean something
    let keepCallsign, deleteCallsign;
    if (keepValid) {
        keepCallsign = await findCallsignFromInput(authorKeepElement);
    }
    if (deleteValid) {
        deleteCallsign = await findCallsignFromInput(authorDeleteElement);
    }

    // Easy: everything works
    if (keepCallsign && deleteCallsign) {
        // Enable preview button
        mergePreviewElement.disabled = false;

        // Update inputs and labels
        showValidMergeInput(authorKeepElement, keepCallsign);
        showValidMergeInput(authorDeleteElement, deleteCallsign);
        return true;
    }

    // Somthing's not right, disable preview button
    mergePreviewElement.disabled = true;

    // Handle each input
    keepBlank = !authorKeepElement.value;
    if (keepCallsign || keepBlank)
        showValidMergeInput(authorKeepElement, keepCallsign);
    else showInvalidMergeInput(authorKeepElement);

    deleteBlank = !authorDeleteElement.value;
    if (deleteCallsign || deleteBlank)
        showValidMergeInput(authorDeleteElement, deleteCallsign);
    else showInvalidMergeInput(authorDeleteElement);
};
const previewAuthorMerge = () => {
    // Double check inputs
    if (!validateMergeInputs()) return;

    // Get authors to preview
    const authorKeep = {
        authorId: authorKeepElement.value,
    };
    const authorDelete = {
        authorId: authorDeleteElement.value,
    };

    // Send preview request
    const previewPromise = previewMerge(authorKeep, authorDelete);

    // Display preview
    displayMergePreview(previewPromise);

    // Enable do merge button
    mergePreviewElement.classList.add('hidden');
    document.getElementById('merge-do').classList.remove('hidden');
};
const doAuthorMerge = async () => {
    // Double check inputs
    if (!validateMergeInputs()) return;

    // Get authors to merge
    const authorKeep = {
        authorId: authorKeepElement.value,
    };
    const authorDelete = {
        authorId: authorDeleteElement.value,
    };

    // Send merge request
    const mergeResponse = await executeMerge(authorKeep, authorDelete);
    const mergeSuccess = await mergeResponse.json();

    // Display feedback
    const notificationEl = document.querySelector('#merge .notification');
    if (mergeSuccess) notificationEl.textContent = 'Merge complete!';
    else notificationEl.textContent = 'Merge failed...';

    loadAuthors();
};

// Data editing
const callsignBlur = ({target}) => {
    // Collect data
    const callsign = target.innerText;
    const authorId = target.closest('.rolodex').dataset.authorId;

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
    const authorId = target.closest('.rolodex').dataset.authorId;

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

/*---------------------*\
  "On Load" Preparation
\*---------------------*/
let dataTable;
let pageCurrElement, pageTotalElement;
let mergePreviewElement, authorKeepElement, authorDeleteElement;
document.addEventListener('DOMContentLoaded', () => {
    // Save common elements
    dataTable = document.getElementById('data-table');

    pageCurrElement = document.getElementById('page-curr');
    pageTotalElement = document.getElementById('page-total');

    mergePreviewElement = document.getElementById('merge-preview');
    authorKeepElement = document.getElementById('authorKeepId');
    authorDeleteElement = document.getElementById('authorDeleteId');

    // Set event listeners
    pageCurrElement.addEventListener('keydown', pageCurrInput);
    document
        .getElementById('merge-button')
        .addEventListener('click', showMergeModal);
    document
        .getElementById('search-button')
        .addEventListener('click', showSearch);

    // Fetch and display first page
    loadAuthors();
});
