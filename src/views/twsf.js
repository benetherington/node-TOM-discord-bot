/*---*\
  API
\*---*/
const getUnscored = () =>
    fetch('/api/twsf/unscored')
        .then((r) => r.json())
        .then((jsn) => {
            updateEpNum(jsn.epNum);
            return jsn.guesses;
        });
const getCorrect = () =>
    fetch('/api/twsf/correct')
        .then((r) => r.json())
        .then((jsn) => {
            updateEpNum(jsn.epNum);
            return jsn.guesses;
        });
const postScore = (guess) =>
    fetch('/api/twsf/score', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(guess),
    });
const guessTypeNames = Object.getOwnPropertyNames(guessTypes).map((name) =>
    name.toLowerCase().replace('_', '-'),
);
// GET calls return {guesses, epNum}, where guesses looks like:
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

/*---------------*\
  ELEMENT HELPERS
\*---------------*/
const currentMode = () => document.querySelector('#filter input:checked').value;
let guessCard;
document.addEventListener('DOMContentLoaded', () => {
    guessCard = document.getElementById('guesses');
});

const sanitizeInput = (text) =>
    text.replace('javascript', '').replace('<', '[');
const getLinkHref = (guess) => {
    if (guess.type === guessTypes.TWEET) {
        return 'https://www.twitter.com/twitter/status/' + guess.tweetId;
    } else if (guess.type === guessTypes.TWITTER_DM) {
        return 'https://twitter.com/messages/2827032970-' + guess.tweetId;
    } else if (guess.type === guessTypes.DISCORD && guess.discordReplyId) {
        return (
            'https://discord.com/channels/137948573605036033/934901291644256366/' +
            guess.discordReplyId
        );
    } else return '';
};
const createGuessRow = (guess) => {
    // Assemble and sanitize variables to display
    const type = guessTypeNames[guess.type];
    const unsanitizedName =
        guess.callsign ||
        guess.displayName ||
        guess.twitterDisplayName ||
        guess.emailName;
    const authorName = sanitizeInput(unsanitizedName);
    const guessText = sanitizeInput(guess.text);
    const linkHref = getLinkHref(guess);

    // Build element to put on the page
    const rowContainer = document.createElement('div');
    rowContainer.classList.add('row-container');
    rowContainer.innerHTML = `
        <div class="info card">
            <div class="link ${type}"></div>
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
        <div class="text">${guessText}</div>`;

    rowContainer
        .querySelector('.link')
        .addEventListener('click', () => window.open(linkHref));
    rowContainer
        .querySelectorAll('input')
        .forEach((input) => input.addEventListener('change', newScore));
    return rowContainer;
};
const setGuessPoints = (row, guess) => {
    if (guess.bonusPoint) value = 'bonus';
    else if (guess.correct) value = 'correct';
    else value = 'none';
    row.querySelector(`input[value=${value}]`).checked = true;
};
const setPointsStyle = ({row, input, override}) => {
    if (!input) input = row.querySelector('input:checked');
    const dotPoints = input.closest('.points');
    dotPoints.classList.remove('bonus', 'correct', 'none', 'error', 'loading');
    dotPoints.classList.add(override || input.value);
};
const updateEpNum = (epNum) => {
    document.getElementById('episode-number').innerText = epNum;
};

/*-------------*\
  EVENT HELPERS
\*-------------*/
const clearGuesses = () => {
    while ((child = guessCard.firstChild)) child.remove();
};
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
        setPointsStyle({row});
        guessCard.append(row);
    }
};

/*------------------*\
  GUI EVENT HANDLERS
\*------------------*/
const updateGuessList = async () => {
    clearGuesses();
    await addUnscoredGuesses();
    if (currentMode() === 'week') addCorrectGuesses();
};
const newScore = async (event) => {
    // Set points style to loading
    setPointsStyle({input: event.target, override: 'loading'});

    // Build request data
    const sliderValue = event.target.value;
    const guessId = event.target.id.match(/\d+/)[0];
    const correct = sliderValue !== 'none';
    const bonusPoint = sliderValue === 'bonus';
    const guess = {guessId, correct, bonusPoint};

    // Send update request
    const response = await postScore(guess);
    if (response.ok) {
        setPointsStyle({input: event.target});
    } else {
        // Deselect the slider
        event.target.checked = false;
        setPointsStyle({input: event.target, override: 'error'});
    }
};
document.addEventListener('DOMContentLoaded', () => {
    updateGuessList();
});
