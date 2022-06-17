/*---*\
  API
\*---*/
const getAuthors = (offset, limit) => {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    return fetch(`/api/authors?${params}`).then((r) => r.json());
};

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
    
    const dividerElement = document.createElement('div')
    dividerElement.classList.add("social-divider")
    socialElement.append(dividerElement)

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
    const rolodex = document.createElement('div');
    rolodex.classList.add('rolodex', `author-${authorId}`);
    rolodex.title = `${authorId}`;

    const callsignEl = document.createElement('div');
    callsignEl.classList.add('callsign');
    callsignEl.textContent = callsign;
    rolodex.append(callsignEl);

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

    const notesEl = document.createElement('textarea');
    notesEl.classList.add('notes');
    notesEl.placeholder = 'No listener notes yet...';
    notesEl.value = notes;
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
const getCurrentRecordsPerPage = () => 20;
const setPaginationTotal = (totalCount) => {
    const totalPages = Math.ceil(totalCount / getCurrentRecordsPerPage());
    pageTotalElement.textContent = totalPages;
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
