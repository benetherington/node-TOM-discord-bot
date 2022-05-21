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
    fetch('/api/twsf/score', {method: 'POST', body: JSON.stringify(guess)});
const postScores = (guess) =>
    fetch('/api/twsf/scores', {method: 'POST', body: JSON.stringify(guess)});

/*--------------------*\
  ELEMENT CONSTRUCTORS
\*--------------------*/
const guessCard = document.getElementById("guesses");
const currentMode = document.querySelector('#filter input:checked').value;
const createGuessRow = (guess)=>{
    
}

/*-------------*\
  EVENT HELPERS
\*-------------*/
const clearGuesses = () => {};
const addUnscoredGuesses = async () => {
    const guesses = await getUnscored();
    for (guess of guesses) {
        const row = createGuessRow();
        guessCard.append(row)
    }
};
const addCorrectGuesses = async () => {};

/*------------------*\
  GUI EVENT HANDLERS
\*------------------*/
const refreshGuesses = async () => {
    clearGuesses();
    await addUnscoredGuesses();
    // if (currentMode === 'week') addCorrectGuesses();
};

document.addEventListener('DOMContentLoaded', () => {
    // refreshGuesses();
});
