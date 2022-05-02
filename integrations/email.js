const {addNewTwsfGuess} = require('../src/sqlite/twsf');

// Glitch handles its own env
try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const parseTextContent = (textContent) => {
    // Parse forwarded emails. For now, we won't be collecting emails directly
    // from listeners. Instead, Ben will forward them.
    // Any of these parsing steps might encounter errors. Let's make future
    // debugging easier by accumulating error messages as we go and including
    // them in the database.
    let errors = new Array();

    // The major components we're looking for are separated by line breaks
    const textLines = textContent.split(/(\r|\n|\r\n)/);

    // From: Damonjalis <fake_greek_email@gmail.com>
    let nick = '',
        email = '';
    try {
        // Look for the right line
        const fromLine = textLines.find((line) => line.startsWith('From:'));
        // Split out nickname and email address
        ({nick, email} = /From: (?<nick>.*?) <(?<email>.*?)>/.exec(
            fromLine,
        ).groups);
    } catch (error) {
        errors.push(['from', error.message]);
    }

    // Subject: Thisweeksf
    let subject = '';
    try {
        // Look for the right line
        const subjectLine = textLines.find((line) =>
            line.startsWith('Subject:'),
        );
        // Strip off the beginning
        subject = subjectLine.slice(9);
    } catch (error) {
        errors.push(['subject', error.message]);
    }

    // To: info@tom.com\n\n\nYour multiline\nmessage here.
    let body = '';
    try {
        // We'll ignore everything before the "To:" line
        const toLineIdx = textLines.findIndex((line) => line.startsWith('To:'));
        // After "To:", we'll skip all empty lines.
        const bodyStartOffset = textLines
            .slice(toLineIdx + 1)
            .findIndex((line) => /\S/.test(line));
        // Once we have a line with more than whitespace, we'll grab it,
        // everything after it, and squish them together. Line breaks should
        // already be present.
        body = textLines.slice(toLineIdx + bodyStartOffset + 1).join('');
    } catch (error) {
        errors.push(['body', error.message]);
    }

    // Ensure only strings or null are passed to the database
    if (errors.length) {
        errors = JSON.stringify(Object.fromEntries(errors));
    } else {
        errors = null;
    }

    return {nick, email, subject, body, errors};
};

module.exports.storeNewTwsfEmail = (textContent) => {
    // Parse the email
    const {
        nick: emailName,
        email: emailAddress,
        subject,
        body: text,
        errors,
    } = parseTextContent(textContent);

    // Prepare database data
    const guess = {type: 'email', subject, text};
    const author = {email, emailAddress, emailName};

    // Store email
    const success = addNewTwsfGuess({guess, author});

    // Done!
    if (success) console.log('Done storing new TWSF email!');
    else {
        console.error('Something went wrong while storing TWSF email...');
        console.error({storeageResults});
    }
};
