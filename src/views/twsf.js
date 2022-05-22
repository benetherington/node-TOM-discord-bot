/*---*\
  API
\*---*/
// [
//     {
//         "type": 0,
//         "text": "Tweet, from author 1.",
//         "correct": 1,
//         "bonusPoint": 0,
//         "callsign": null,
//         "twitterDisplayName": null,
//         "displayName": "The Very 0th",
//         "emailName": null
//     },

// ]
const getUnscored = () => fetch('/api/twsf/unscored').then((r) => r.json());
const getCorrect = () => fetch('/api/twsf/correct').then((r) => r.json());
const postScore = (guess) =>
    fetch('/api/twsf/score', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(guess),
    });
const getGuessName = (typeNo) =>
    Object.getOwnPropertyNames(guessTypes)
        [guess.type].toLowerCase()
        .replace('_', '-');

/*--------------------*\
  ELEMENT CONSTRUCTORS
\*--------------------*/
const guessCard = document.getElementById('guesses');
const currentMode = document.querySelector('#filter input:checked').value;
const sanitizeInput = (text) =>
    text.replace('javascript', '').replace('<', '[');
const createGuessRow = (guess) => {
    // Assemble and sanitize variables to display
    const authorName = sanitizeInput(
        guess.callsign ||
            guess.displayName ||
            guess.twitterDisplayName ||
            guess.emailName,
    );
    const guessText = sanitizeInput(guess.text);
    const type = getGuessName(guess.type);

    // Build element to put on the page
    const rowContainer = document.createElement('div');
    rowContainer.classList.add('row-container');
    rowContainer.dataset.guess = guess;
    rowContainer.innerHTML = `
        <div class="author">
            <h3 class="callsign">${authorName}</h3>
            <div class="points slide-radio three">
                <input
                    class="toggle-option"
                    id="none-${guess.guessId}"
                    type="radio"
                    name="points-${guess.guessId}"
                    value="none"
                    required>
                <label for="none-${guess.guessId}"></label>
                <input
                    class="toggle-option"
                    id="correct-${guess.guessId}"
                    type="radio"
                    name="points-${guess.guessId}"
                    value="correct"
                    required>
                <label for="correct-${guess.guessId}"></label>
                <input
                    class="toggle-option"
                    id="bonus-${guess.guessId}"
                    type="radio"
                    name="points-${guess.guessId}"
                    value="bonus"
                    required>
                <label for="bonus-${guess.guessId}"></label>
                <div class="slider"></div>
            </div>
        </div>
        <div class="text">${guessText}</div>
        <button class="link ${type}"></button>`;

    rowContainer
        .querySelectorAll('input')
        .forEach((input) => input.addEventListener('change', newScore));
    return rowContainer;
};
const setGuessPoints = (row, guess) => {
    if (guess.bonusPoint) {
        row.querySelector('input[value=bonus]').checked = true;
    } else if (guess.correct) {
        row.querySelector('input[value=correct]').checked = true;
    } else {
        row.querySelector('input[value=none]').checked = true;
    }
};

/*-------------*\
  EVENT HELPERS
\*-------------*/
const clearGuesses = () => {};
const addUnscoredGuesses = async () => {
    const guesses = await getUnscored();
    for (guess of guesses) {
        const row = createGuessRow(guess);
        guessCard.append(row);
    }
};
const addCorrectGuesses = async () => {
    const guesses = await getCorrect();
    for (guess of guesses) {
        const row = createGuessRow(guess);
        setGuessPoints(row, guess);
        guessCard.append(row);
    }
};
const newScore = async (event) => {
    // Build request data
    const sliderValue = event.target.value;
    const guessId = event.target.id.match(/\d+/)[0];
    const correct = sliderValue !== 'none';
    const bonusPoint = sliderValue === 'bonus';
    const guess = {guessId, correct, bonusPoint};

    // Send update request
    const response = await postScore(guess);
    if (!response.ok) {
        // Deselect the slider
        event.target.checked = false;
        // TODO: add error feedback for user
    }
};

/*------------------*\
  GUI EVENT HANDLERS
\*------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    clearGuesses();
    await addUnscoredGuesses();
    if (currentMode === 'week') addCorrectGuesses();
});
