const {addNewTwsfGuess, addTwsfError} = require('../database/twsf');

// Glitch handles its own env
try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const shiftFromLine = (textLines) => {
    let fromLine; // = "From: Damonjalis <fake_greek_email@gmail.com>"

    // Shift out lines until we find one starting with "From:"
    while (!fromLine) {
        const thisLine = textLines.shift();
        if (thisLine.startsWith('From:')) {
            fromLine = thisLine;
        }
    }

    // Parse the line
    const nickAndEmail = /From: (?<nick>.*?) <(?<email>.*?)>/.exec(
        fromLine,
    ).groups;

    // Done!
    return nickAndEmail;
};
const shiftSubjectLine = (textLines) => {
    let subjectLine; // = "Subject: Thisweeksf"

    // Shift out lines until we find one starting with "Subject:"
    while (!subjectLine) {
        const thisLine = textLines.shift();
        if (thisLine.startsWith('Subject:')) {
            subjectLine = thisLine;
        }
    }

    // Parse the line
    const subject = subjectLine.slice(9);

    // Done!
    return subject;
};
const shiftBodyLines = (textLines) => {
    // "To: info@tom.com\n\n\nYour multiline\nmessage here."
    let doneLooking = false;

    // Shift out lines until we find one starting with "To:"
    while (!doneLooking) {
        const thisLine = textLines.shift();
        doneLooking = thisLine.startsWith('To:');
    }

    // Shift out whitespace-only lines
    doneLooking = false;
    while (!doneLooking) {
        textLines.shift();
        doneLooking = /\S/.test(textLines[0]);
    }

    // Join the rest of the email
    body = textLines.join('');

    // Done!
    return body;
};
const parseTextContent = (textContent) => {
    // Parse forwarded emails. For now, we won't be collecting emails directly
    // from listeners. Instead, Ben will forward them.
    // Any of these parsing steps might encounter errors. Let's make future
    // debugging easier by accumulating error messages as we go and including
    // them in the database.
    const parsedElements = {};
    let errors = [];

    // The components we're looking for are separated by line breaks
    const textLines = textContent.split(/(\r|\n|\r\n)/);

    // From: Damonjalis <fake_greek_email@gmail.com>
    try {
        const {nick, email} = shiftFromLine(textLines);
        parsedElements.nick = nick;
        parsedElements.email = email;
    } catch (error) {
        errors.push(['from', error.message]);
    }

    // Subject: Thisweeksf
    try {
        // Look for the right line
        parsedElements.subject = shiftSubjectLine(textLines);
    } catch (error) {
        errors.push(['subject', error.message]);
    }

    // To: info@tom.com\n\n\nYour multiline\nmessage here.
    try {
        // Look for the right line
        parsedElements.body = shiftBodyLines(textLines);
    } catch (error) {
        errors.push(['body', error.message]);
    }

    // Log any errors
    if (errors.length) {
        console.log('Non-fatal error/s encountered while parsing TWSF email:');
        console.log(errors);
    } else {
        errors = null;
    }

    // Done!
    return {parsedElements, errors};
};

const guessAndAuthorFromEmail = ({parsedElements, errors}) => {
    const subject = parsedElements.subject;
    const text = parsedElements.body;
    const guess = {type: 'email', subject, text, errors};

    const emailAddress = parsedElements.email;
    const emailName = parsedElements.nick;
    const author = {emailAddress, emailName};

    return {guess, author};
};

module.exports = (textContent) => {
    try {
        // Parse the email
        const parsedElementsAndErrors = parseTextContent(textContent);
        if (!parsedElementsAndErrors.parsedElements)
            throw 'Something went wrong while parsing TWSF email...';

        // Prepare database data
        const guessAndAuthor = guessAndAuthorFromEmail(parsedElementsAndErrors);
        if (!guessAndAuthor.guess && guessAndAuthor.author)
            throw 'Something went wrong while preparing to store TWSF email...';

        // Store email
        const successfullyStored = addNewTwsfGuess(guessAndAuthor);
        if (!successfullyStored)
            throw 'Something went wrong while storing TWSF email...';

        // Done!
        console.log('Done storing new TWSF email!');
    } catch (error) {
        console.error(error);
        console.error(textContent);
        addTwsfError(JSON.stringify({error, textContent}));
    }
};
