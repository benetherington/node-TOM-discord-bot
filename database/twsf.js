module.exports.addNewTwsfGuess = ({author, guess}) => {
    console.log('add new twsf guess');
    console.table({author, guess});
    return guess;
};

module.exports.updateTwsfGuess = (guess, messageId) => {
    console.log('update twsf guess');
    console.table({guess, messageId});
    return guess;
};
