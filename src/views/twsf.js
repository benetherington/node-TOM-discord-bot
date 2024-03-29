/*---*\
  API
\*---*/
const getUnscored = async () => {
    const resp = await fetch('/api/twsf/unscored');
    const jsn = await resp.json();

    updateEpNum(jsn.epNum);
    return jsn.guesses;
};
const getCorrect = async () => {
    const resp = await fetch('/api/twsf/correct');
    const jsn = await resp.json();

    updateEpNum(jsn.epNum);
    return jsn.guesses;
};
const getCurrent = async () => {
    const resp = await fetch('/api/twsf/current');
    const jsn = await resp.json();

    updateEpNum(jsn.epNum);
    return jsn.guesses;
};
const getThankYous = () => fetch('/api/twsf/thankyou').then((r) => r.json());
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

// Episode number
const updateEpNum = (epNum) => {
    document.getElementById('episode-number').innerText = epNum;
};

// Guess rows
const sanitizeContent = (text) =>
    text.replaceAll(
        /<\/?(p|span|br|a|del|pre|code|em|strong|b|i|u|ul|ol|li|blockquote)( [^>]*)?>/gi,
        '',
    );
const safeParseContent = (text) => {
    const elements = [];

    while (text.length) {
        const hrefRe =
            /(?<before>.*?)(<a href="(?<href>[^"]*?)".*?>(?<link>.*?)<\/a>)/gi;
        const hrefMatch = hrefRe.exec(text);
        text = text.slice(hrefRe.lastIndex);

        if (hrefMatch) {
            const {before, href, link} = hrefMatch.groups;

            const span = document.createElement('span');
            span.innerText = sanitizeContent(before);
            elements.push(span);

            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.innerText = sanitizeContent(link);
            elements.push(anchor);
        } else {
            const span = document.createElement('span');
            span.innerText = sanitizeContent(text);
            elements.push(span);
            break;
        }
    }

    return elements;
};
const getLinkHref = (guess) => {
    if (guess.type === guessTypes.TWEET) {
        return 'https://www.twitter.com/twitter/status/' + guess.tweetId;
    } else if (guess.type === guessTypes.TWITTER_DM) {
        return 'https://twitter.com/messages/2827032970-' + guess.tweetId;
    } else if (guess.type === guessTypes.TOOT) {
        const [_, userName, instanceName] =
            guess.mastodonUsername.match(/(.*)@(.*)/);
        return `https://${instanceName}/@${userName}/${guess.tootId}`;
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
    const authorName = sanitizeContent(unsanitizedName);
    const guessElements = safeParseContent(guess.text);
    const linkHref = getLinkHref(guess);

    // Clone row container
    const rowContainer = document
        .getElementById('row-container')
        .content.firstElementChild.cloneNode(true);

    // Set easy properties
    rowContainer.querySelector('.link').classList.add(type);
    rowContainer.querySelector('.callsign').title = authorName;
    rowContainer.querySelector('.callsign').innerText = authorName;
    rowContainer.querySelector('.text').append(...guessElements);

    // Set form input properties
    rowContainer.querySelector('#none-id').name = `points-${guess.guessId}`;
    rowContainer.querySelector('#none-id').id = `none-${guess.guessId}`;
    rowContainer
        .querySelector('[for=none-id]')
        .setAttribute('for', `none-${guess.guessId}`);

    rowContainer.querySelector('#correct-id').name = `points-${guess.guessId}`;
    rowContainer.querySelector('#correct-id').id = `correct-${guess.guessId}`;
    rowContainer
        .querySelector('[for=correct-id]')
        .setAttribute('for', `correct-${guess.guessId}`);

    rowContainer.querySelector('#bonus-id').name = `points-${guess.guessId}`;
    rowContainer.querySelector('#bonus-id').id = `bonus-${guess.guessId}`;
    rowContainer
        .querySelector('[for=bonus-id]')
        .setAttribute('for', `bonus-${guess.guessId}`);

    // rowContainer.innerHTML = `
    //     <div class="info card">
    //         <div class="link ${type}"></div>
    //         <h3 class="callsign" title="${authorName}">${authorName}</h3>
    //         <div class="points slide-radio three">
    //             <input
    //                 class="toggle-option"
    //                 id="none-${guess.guessId}"
    //                 type="radio"
    //                 name="points-${guess.guessId}"
    //                 value="none"
    //                 required>
    //             <label for="none-${guess.guessId}"></label>
    //             <input
    //                 class="toggle-option"
    //                 id="correct-${guess.guessId}"
    //                 type="radio"
    //                 name="points-${guess.guessId}"
    //                 value="correct"
    //                 required>
    //             <label for="correct-${guess.guessId}"></label>
    //             <input
    //                 class="toggle-option"
    //                 id="bonus-${guess.guessId}"
    //                 type="radio"
    //                 name="points-${guess.guessId}"
    //                 value="bonus"
    //                 required>
    //             <label for="bonus-${guess.guessId}"></label>
    //             <div class="slider"></div>
    //         </div>
    //     </div>
    //     <div class="text">${guessText}</div>`;

    // Add events
    rowContainer
        .querySelector('.link')
        .addEventListener('click', () => window.open(linkHref));
    rowContainer
        .querySelectorAll('input')
        .forEach((input) => input.addEventListener('change', newScore));
    return rowContainer;
};
const setGuessPoints = ({row, guess}) => {
    const val = guess.bonusPoint ? 'bonus' : guess.correct ? 'correct' : 'none';
    row.querySelector(`input[value=${val}]`).checked = true;
};
const setPointsStyle = ({row, input, override}) => {
    if (!input) input = row.querySelector('input:checked');
    const dotPoints = input.closest('.points');
    dotPoints.classList.remove('bonus', 'correct', 'none', 'error', 'loading');
    dotPoints.classList.add(override || input.value);
};

// Summary boxes
const setNextWeekBox = () => {
    document.getElementById('next-week').textContent = getNextWeekStrings();
};
const getNextWeekStrings = () => {
    // Find when the next episode airs, next Tuesday.
    const today = new Date();
    const todayDate = today.getDate();
    const daysTillTuesday = (9 - today.getDay()) % 7;

    // The week following next Tues is "this week", the week after is "next
    // week." This period starts on the second tuesday and ends on the following
    // Monday.
    const start = new Date(today);
    start.setDate(todayDate + daysTillTuesday + 7);
    const end = new Date(today);
    end.setDate(todayDate + daysTillTuesday + 13);

    sDate = start.getDate();
    sMonth = start.getMonth();
    eDate = end.getDate();
    eMonth = end.getMonth();

    return (
        `Next week is the ${sDate}${ordinals[sDate]}` +
        (sMonth === eMonth ? '' : ` of ${months[sMonth]}`) +
        ` to the ${eDate}${ordinals[eMonth]} of ${months[eMonth]}. Do you have a clue for us?` +
        `\r\nNext week (${sMonth + 1}/${sDate} - ${eMonth + 1}/${eDate}) in`
    );
};
const setWinnersBox = () => {
    const {correctCallsigns, bonusCallsigns} = getWinnersCallsigns();
    document.getElementById('winners').textContent =
        `Correct: ${correctCallsigns.join(', ')}\r\n` +
        `Bonus points: ${bonusCallsigns.join(', ')}`;
};
const getWinnersCallsigns = () => {
    // Find checked input elements
    const checkedCorrect = document.querySelectorAll(
        "#guesses .toggle-option[value='correct']:checked",
    );
    const checkedBonus = document.querySelectorAll(
        "#guesses .toggle-option[value='bonus']:checked",
    );

    // From input elements, back up to info card
    const correctInfos = Array.from(checkedCorrect).map((el) =>
        el.closest('.info'),
    );
    const bonusInfos = Array.from(checkedBonus).map((el) =>
        el.closest('.info'),
    );

    // From info card, get .callsign content
    const correctCallsigns = Array.from(correctInfos).map(
        (el) => el.querySelector('.callsign').textContent,
    );
    const bonusCallsigns = Array.from(bonusInfos).map(
        (el) => el.querySelector('.callsign').textContent,
    );

    // Done!
    return {correctCallsigns, bonusCallsigns};
};
const setThankYouBox = async () => {
    const thankYous = await getThankYous();
    const finalThankYou = thankYous.pop();
    let names;
    if (thankYous.length) {
        names = thankYous.map((t) => t.callsign).join(', ');
        names += ', and ';
        names += finalThankYou.callsign;
    } else if (finalThankYou) {
        names = finalThankYou.callsign;
    } else {
        names = 'FUCKEN NO ONE';
    }
    document.getElementById('thank-you').textContent =
        'We record live on Sundays at 9am PT/12pm ET. Thank you so much to ' +
        names +
        ' for joining our recording session today and helping us make ' +
        'correction burns on the fly.';
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
        setGuessPoints({row, guess});
        setPointsStyle({row});
        guessCard.append(row);
    }
};
const addAllGuesses = async () => {
    const guesses = await getCurrent();
    for (guess of guesses) {
        const row = createGuessRow(guess);
        setGuessPoints({row, guess});
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
    if (currentMode() === 'all') await addAllGuesses();
    if (currentMode() == 'week') await addCorrectGuesses();

    setWinnersBox();
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
    setWinnersBox();
};
const copyElementTextContent = (event) =>
    navigator.clipboard.writeText(event.target.textContent);

/*-----*\
  SETUP
\*-----*/
document.addEventListener('DOMContentLoaded', () => {
    updateGuessList();
    setNextWeekBox();
    setThankYouBox();
    document
        .getElementById('winners')
        .addEventListener('click', copyElementTextContent);
    document
        .getElementById('next-week')
        .addEventListener('click', copyElementTextContent);
    document
        .getElementById('thank-you')
        .addEventListener('click', copyElementTextContent);

    document
        .getElementById('filter')
        .querySelectorAll('input')
        .forEach((input) => input.addEventListener('change', updateGuessList));
});

const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const ordinals = [
    'ike',
    'st',
    'nd',
    'rd',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'st',
    'nd',
    'rd',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'th',
    'st',
];
