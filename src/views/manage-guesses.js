/*-----------*\
  GUI HELPERS
\*-----------*/
const addGuessRow = (guess) => {
    const row = buildGuessRow(guess);
    dataTable.append(row);
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

/*----------*\
  SEARCH BOX
\*----------*/
const performGuessSearch = (searchString) => {
    const [yesMatch, notMatch] = getMatchingGuessRows(searchString);

    if (yesMatch.length) {
        yesMatch.forEach((row) => row.classList.remove('hidden'));
        notMatch.forEach((row) => row.classList.add('hidden'));
        document.getElementById('search-button').classList.add('active');
    } else {
        notMatch.forEach((row) => row.classList.remove('hidden'));
        document.getElementById('search-button').classList.remove('active');
    }
};
const getMatchingGuessRows = (searchString) => {
    const guessRows = [...document.querySelectorAll('.guess-row')];
    if (searchString.length === 0) return [[], guessRows];

    return guessRows.reduce(
        ([pass, fail], row) =>
            row.innerText.toLowerCase().includes(searchString)
                ? [[...pass, row], fail] // add row to pass list
                : [pass, [...fail, row]], // add row to fail list
        [[], []], // start with empty pass/fail arrays
    );
};
