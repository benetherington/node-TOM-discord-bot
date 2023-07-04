/*---*\
  API
\*---*/
const getGuesses = async (offset, limit) => {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    const response = await fetch(`/api/guesses?${params}`);
    return response.json();
};

/*-----------*\
  GUI BUILDER
\*-----------*/
buildGuessRow = (guess) => {
    // { guessId, type,
    //   text, correct, bonusPoint, epNum,
    //   authorId, callsign,
    //   tweetId, discordReplyId, mastodonUsername, tootId,
    //   created_at }

    // Assemble and sanitize variables to display
    const type = guessTypeNames[guess.type];
    const authorName = sanitizeContent(guess.callsign);
    const guessElements = safeParseContent(guess.text);
    // const linkHref = getLinkHref(guess);
    const createdAt = new Date(guess.created_at);
    const createdElapsed = elapsedTime(createdAt);
    const createdString =
        createdElapsed.totalDay > 7
            ? createdAt.toLocaleDateString()
            : timeAgo(createdElapsed);

    // Clone row container
    const row = document
        .getElementById('guess-row')
        .content.firstElementChild.cloneNode(true);

    // Set easy properties
    row.querySelector('.link').classList.add(type);
    row.querySelector('.callsign').title = authorName;
    row.querySelector('.callsign').innerText = authorName;
    row.querySelector('.text').append(...guessElements);
    if (guess.epNum) row.querySelector('.epNum').innerText = guess.epNum;
    else row.querySelector('.epNum').classList.add('unscored');
    row.querySelector('.date').innerText = createdString;

    // Set form input properties
    row.querySelector('#none-id').name = `points-${guess.guessId}`;
    row.querySelector('#none-id').id = `none-${guess.guessId}`;
    row.querySelector('[for=none-id]').for = `none-${guess.guessId}`;

    row.querySelector('#correct-id').name = `points-${guess.guessId}`;
    row.querySelector('#correct-id').id = `correct-${guess.guessId}`;
    row.querySelector('[for=correct-id]').for = `correct-${guess.guessId}`;

    row.querySelector('#bonus-id').name = `points-${guess.guessId}`;
    row.querySelector('#bonus-id').id = `bonus-${guess.guessId}`;
    row.querySelector('[for=bonus-id]').for = `bonus-${guess.guessId}`;

    // Add events
    // row.querySelector('.link').addEventListener('click', () =>
    //     window.open(linkHref),
    // );
    row.querySelectorAll('input').forEach((input) =>
        input.addEventListener('change', newScore),
    );

    // Set points slider
    if (guess.epNum) {
        setGuessPoints({row, guess});
        setPointsStyle({row});
    }

    return row;
};

/*-----------*\
  GUI HELPERS
\*-----------*/
const guessTypeNames = Object.getOwnPropertyNames(guessTypes).map((name) =>
    name.toLowerCase().replace('_', '-'),
);
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

const elapsedTime = (startDate) => {
    const deltaMilli = Date.now() - startDate.getTime();
    const totalSec = deltaMilli / 1000;
    const totalMin = totalSec / 60;
    const totalHr = totalMin / 60;
    const totalDay = totalHr / 24;

    const days = Math.floor(totalDay);
    const hours = Math.floor(totalHr % 24);
    const mins = Math.floor(totalMin % 60);
    const secs = Math.floor(totalSec % 60);

    return {days, hours, mins, secs, totalDay};
};
const timeAgo = ({days, hours, mins, secs}) => {
    if (days > 7) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    if (mins > 10) return `${mins} minutes ago`;
    if (mins > 0) return `${mins} minutes, ${secs} seconds ago`;
    if (secs > 30) return `${secs} seconds ago`;
    return 'Just now';
};

/*------------------*\
  GUI Event Handlers
\*------------------*/
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
