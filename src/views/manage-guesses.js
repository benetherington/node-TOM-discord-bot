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

/*------------*\
  GUI BUILDERS
\*------------*/
buildGuessRow = ({
    guessId,
    type,
    text,
    correct,
    tweetId,
    discordReplyId,
    authorId,
    callsign,
    created_at,
}) => {
    // Row container
    const rolodex = document.createElement('div');
    rolodex.classList.add('rolodex');
    rolodex.dataset.guessId = guessId;
    
    // 
}
// {
//     "guessId": 304,
//     "type": 1,
//     "text": "Hey there! The hashtag is #thisweeksf, but I'm adding your guess in manually. :)",
//     "correct": 0,
//     "tweetId": 0,
//     "discordReplyId": null,
//     "authorId": 46,
//     "callsign": "The Orbital Mechanics Podcast",
//     "created_at": "2022-07-03 13:00:01"
// }

/*-----------*\
  GUI HELPERS
\*-----------*/
const addGuessRow = (guess) => {
    const rolodex = buildGuessRow(guess);
    dataTable.append(rolodex);
};

/*------------------*\
  GUI Event Handlers
\*------------------*/
const loadGuesses = async () => {
    const currentPage = getCurrentPage();
    const limit = getCurrentRecordsPerPage();
    const offset = limit * (currentPage - 1);

    // Send request
    const {guesses, count} = await getGuesses(offset, limit);

    // Update page
    clearDataRows();
    guesses.forEach(addGuessRow);
    setPaginationTotal(count);
};
