require('dotenv').config();

const logger = require('../logger');

const {addNewGuess, addTwsfError, guessTypes} = require('../database/twsf');

/*-----------------*\
  PARSING UTILITIES
\*-----------------*/
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
        thisLine = textLines.shift();
        doneLooking = thisLine.startsWith('To:');
    }

    // Shift out whitespace-only lines
    doneLooking = false;
    while (!doneLooking) {
        doneLooking = /\S/.test(textLines[0]);
        if (!doneLooking) textLines.shift();
    }

    // Capture body lines until we reach block-quoted text
    let foundBlockquote = false;
    let bodyLines = [];
    doneLooking = false;
    while (!doneLooking) {
        thisLine = textLines.shift();
        foundBlockquote = /^>+ /.test(thisLine);
        if (!foundBlockquote && textLines.length) bodyLines.push(thisLine);
        else doneLooking = true;
    }

    // If block-quoted text was found, rewind and discard gmail's forward "header."
    // "On Wed, Aug 3, 2022 at 12:02 PM Name <email> wrote:" (possible line breaks!)
    let foundHeader = false;
    let lineToDrop;
    for (
        lineToDrop = bodyLines.length;
        lineToDrop > 0 && !foundHeader;
        lineToDrop -= !foundHeader // Don't increment past the header
    ) {
        thisLine = bodyLines[lineToDrop];
        foundHeader = /^On (Sun|Mon|Tue|Wed|Thu|Fri), /.test(thisLine);
    }

    // Discard forward "header."
    if (foundHeader) bodyLines = bodyLines.slice(0, lineToDrop);

    // Join the lines we saved.
    body = bodyLines.join('');

    // Done!
    return body;
};

/*---------------*\
  HANDLER HELPERS
\*---------------*/
const parseTextContent = (textContent) => {
    // Parse forwarded emails. For now, we won't be collecting emails directly
    // from listeners. Instead, Ben will forward them.
    // Any of these parsing steps might encounter errors. Let's make future
    // debugging easier by accumulating error messages as we go and including
    // them in the database.
    const parsedElements = {};
    let parsingErrors = [];

    // The components we're looking for are separated by line breaks
    const textLines = textContent.split(/(\r|\n|\r\n)/);

    // From: Damonjalis <fake_greek_email@gmail.com>
    try {
        const {nick, email} = shiftFromLine(textLines);
        parsedElements.nick = nick;
        parsedElements.email = email;
    } catch (error) {
        parsingErrors.push(['from', error.message]);
    }

    // Subject: Thisweeksf
    try {
        // Look for the right line
        parsedElements.subject = shiftSubjectLine(textLines);
    } catch (error) {
        parsingErrors.push(['subject', error.message]);
    }

    // To: info@tom.com\n\n\nYour multiline\nmessage here.
    try {
        // Look for the right line
        parsedElements.body = shiftBodyLines(textLines);
    } catch (error) {
        parsingErrors.push(['body', error.message]);
    }

    // Nullify parsing errors if appropriate
    if (parsingErrors.length === 0) parsingErrors = null;

    // Done!
    return {parsedElements, parsingErrors};
};
const guessAndAuthorFromEmail = ({parsedElements, parsingErrors}) => {
    const subject = parsedElements.subject;
    const text = parsedElements.body;
    const guess = {type: guessTypes.EMAIL, subject, text, parsingErrors};

    const emailAddress = parsedElements.email;
    const emailName = parsedElements.nick;
    const callsign = emailName;
    const author = {emailAddress, emailName, callsign};

    return {guess, author};
};

/*-------*\
  HANDLER
\*-------*/
module.exports = async (textContent) => {
    try {
        // Parse the email
        const {parsedElements, parsingErrors} = parseTextContent(textContent);
        if (!parsedElements)
            throw {
                msg: 'Something went wrong while parsing TWSF email...',
                parsingErrors,
            };

        // Prepare database data
        const guessAndAuthor = guessAndAuthorFromEmail({
            parsedElements,
            parsingErrors,
        });
        if (!guessAndAuthor.guess && guessAndAuthor.author)
            throw {
                msg: 'Something went wrong while preparing to store TWSF email...',
                parsingErrors,
            };

        // Store email
        const successfullyStored = await addNewGuess(guessAndAuthor);
        if (!successfullyStored)
            throw {
                msg: 'Something went wrong while storing TWSF email...',
                parsingErrors,
            };

        // Done!
        logger.info('Done storing new TWSF email!');
    } catch (error) {
        if (error.msg) logger.error({...error, textContent});
        else logger.error({error, textContent});
        addEmailParseError(JSON.stringify({error, textContent}));
    }
};
