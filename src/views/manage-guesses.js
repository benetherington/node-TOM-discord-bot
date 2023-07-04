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
