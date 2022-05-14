module.exports.addNewTwsfGuess = ({author, guess}) => {
    console.table({author, guess});
    return true;
};

module.exports.addTwsfError = (breadCrumbs) => {
    console.table(breadCrumbs);
}