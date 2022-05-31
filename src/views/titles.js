/*----------------------*\
  Suggestion row cration
\*----------------------*/
const createAuthorGridItem = (suggestion, author) => {
    const authorElement = document.createElement('p');
    authorElement.id = `author-${suggestion.suggestionId}`;
    authorElement.classList.add('author');
    authorElement.textContent = author.displayName || author.username;
    return authorElement;
};
const createSuggestionGridItem = (suggestion) => {
    const suggestionElement = document.createElement('p');
    suggestionElement.id = `suggestion-${suggestion.suggestionId}`;
    suggestionElement.classList.add('suggestion');
    suggestionElement.textContent = suggestion.text;
    return suggestionElement;
};
const createVoteCountGridItem = (suggestion, voteCount) => {
    const votesElement = document.createElement('p');
    votesElement.id = `votes-${suggestion.suggestionId}`;
    votesElement.classList.add('votes');
    votesElement.textContent = voteCount;
    return votesElement;
};
const createDeleteGridItem = (suggestion) => {
    const deleteElement = document.createElement('button');
    deleteElement.id = `delete-${suggestion.suggestionId}`;
    deleteElement.classList.add('suggestion-delete');
    deleteElement.onclick = removeSuggestion;
    return deleteElement;
};

const createRow = ({suggestion, author, voteCount}) => {
    const row = document.createElement('div');
    row.classList.add('row-container');
    row.append(createAuthorGridItem(suggestion, author));
    row.append(createSuggestionGridItem(suggestion));
    row.append(createVoteCountGridItem(suggestion, voteCount));
    row.append(createDeleteGridItem(suggestion));

    document.getElementById('suggestion-grid').append(row);
};

/*-----------------------*\
  Suggestion row updation
\*-----------------------*/
const updateRowVoteCount = ({suggestion, voteCount}) => {
    document.getElementById('votes-' + suggestion.suggestionId).textContent =
        voteCount;
};
const createOrUpdateRow = (countedSuggestion) => {
    const displayed = document.querySelector(
        `*[id$='-${countedSuggestion.suggestion.suggestionId}']`,
    );

    if (displayed) updateRowVoteCount(countedSuggestion);
    else createRow(countedSuggestion);
};
const removeRow = (element) => {
    const rowContainer = element.closest('.row-container');
    rowContainer.addEventListener('transitionend', rowContainer.remove);
    rowContainer.classList.add('deleted');
};
// oh also episode number updation
const updateEpNum = (epNum) => {
    document.getElementById('episode-number').textContent = epNum;
};

/*---*\
  API
\*---*/
const getSuggestions = () =>
    fetch('/api/titles/').then(async (r) => {
        const {epNum, titles} = await r.json();
        updateEpNum(epNum);
        return titles;
    });
const deleteSuggestion = (id) => fetch(`/api/titles/${id}`, {method: 'DELETE'});
const postVoteRequest = () => fetch('/api/vote', {method: 'POST'});
const postSuggestion = (id) => fetch(`/api/titles/${id}`, {method: 'POST'});

/*----------------*\
  Suggestion input
\*----------------*/
const suggestionAdded = (e) => {
    const text = e.target.value;
    const match = text.match(/\d{18}/g);
    if (!match) return;
    const suggestionId = match[0];
    postSuggestion(suggestionId);
    suggestionEscape();
};
const suggestionEscape = (e) => {
    if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
    document.getElementById('add-suggestion-modal').remove();
    document.removeEventListener('keydown', suggestionEscape);
    document.removeEventListener('mousedown', suggestionEscape);
};

/*----------*\
  GUI events
\*----------*/
// suggestion rows
async function removeSuggestion(e) {
    const suggestionId = e.target.id.match(/\d+/)[0];
    if (!suggestionId) console.error(e);

    const apiCall = await deleteSuggestion(suggestionId);
    if (apiCall.ok) removeRow(e.target);
}
// bottom toolbar
var updateIntervalId;
const autoUpdate = (doToggle) => {
    const autoButton = document.querySelector('button#autoUpdate');
    if (doToggle && autoButton.classList.toggle('depressed')) {
        updateSuggestions();
        updateIntervalId = setInterval(updateSuggestions, 1000);
    } else {
        autoButton.classList.remove('depressed');
        clearInterval(updateIntervalId);
    }
};
const updateSuggestions = async () => {
    getSuggestions()
        .then((suggestions) => suggestions.forEach(createOrUpdateRow))
        .catch(handleGetSuggestionFailure);
};
const handleGetSuggestionFailure = (error) => {
    console.log(error);
    autoUpdate();
};
const addSuggestion = () => {
    input = document.createElement('input');
    input.id = 'add-suggestion-modal';
    input.oninput = suggestionAdded;
    document.addEventListener('keydown', suggestionEscape);
    document.addEventListener('mousedown', suggestionEscape);
    document.body.append(input);
    input.focus();
};
const callVote = () => postVoteRequest().catch(console.error);

document.addEventListener('DOMContentLoaded', updateSuggestions);
