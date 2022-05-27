const fs = require('fs');
const {parse} = require('csv-parse/sync');
let db;
const {public} = require('./db-accessors');

/*---------*\
  UTILITIES
\*---------*/
const loadCSV = (path) => {
    const CsvFile = fs.readFileSync(path);
    return parse(CsvFile, {columns: true});
};

/*----*\
  MAIN
\*----*/
let archiveEpisodeId;
const importAll = async () => {
    db = await public();

    const episodeInsert = await db.run(
        `INSERT INTO Episodes (epNum) VALUES (88);`,
    );
    archiveEpisodeId = episodeInsert.lastID;

    const audienceIds = await importAudience();
    await importTwitterGuesses(audienceIds);
    await importEmailGuesses(audienceIds);

    let theDebugging = 'start';
};

/*--------*\
  AUDIENCE
\*--------*/
const twitterIdSkips = [
    '891058134524936200',
    '1324973233448300500',
    '730127769468690400',
];
const importAudience = async () => {
    const records = loadCSV('./.data/anvil-imports/audience.csv');
    console.log(`Loaded ${records.length} audience_rows.`);

    const audienceIds = {};
    const failures = [];

    for (audience of records) {
        if (twitterIdSkips.includes(audience.twitter_user_id)) continue;
        if (!(audience.twitter_user_id || audience.email || audience.email)) {
            continue;
        }
        try {
            const authorInsert = await insertAuthor(audience);
            audienceIds[audience.ID] = authorInsert.lastID;
        } catch (error) {
            console.error(error);
            failures.push(audience.ID);
        }
    }

    // Do stome stats logging
    console.log(`Encountered ${failures.length} errors:`);
    console.log(failures);
    const insertsCount = Object.getOwnPropertyNames(audienceIds).length;
    console.log(`Added ${insertsCount} new Author records.\n`);

    return audienceIds;
};
const insertAuthor = (audience) => {
    twitterId = audience.twitter_user_id || undefined;
    twitterUsername = audience.twitter_screen_name || undefined;
    // twitterDisplayName  Not imported from Anvil
    emailAddress = audience.email || undefined;
    // emailName           Not imported from Anvil
    callsign = audience.nickname || '';
    notes = audience.notes;

    return db.run(
        `INSERT INTO Authors
        (twitterId, twitterUsername, emailAddress, callsign, notes)
        VALUES (?, ?, ?, ?, ?);`,
        twitterId,
        twitterUsername,
        emailAddress,
        callsign.trim(),
        notes,
    );
};

/*---------------*\
  TWITTER GUESSES
\*---------------*/
const twitterIdFixes = {
    891058134524936200: '891058134524936193',
    1324973233448300500: '1324973233448300545',
    730127769468690400: '730127769468690432',
};
const importTwitterGuesses = async (audienceIds) => {
    const records = loadCSV('./.data/anvil-imports/guess-twitter.csv');
    console.log(`Loaded ${records.length} tweet_guess_rows`);

    let audienceIdLookupCount = 0;
    let twitterIdLookupCount = 0;
    let guessInsertCount = 0;
    const errors = [];

    for (guess of records) {
        let authorId;
        // Look up by Anvil row id
        if (guess.audience) {
            const rowId = guess.audience.slice(4); // Remove "#ROW"
            authorId = audienceIds[rowId];
            audienceIdLookupCount++;
        }
        // Look up by Twitter user ID
        if (!authorId && guess.twitter_user_id) {
            // Cure bad IDs
            let curedTwitterUserId =
                twitterIdFixes[guess.twitter_user_id] || guess.twitter_user_id;
            // Check the DB
            const authorSelect = await getAuthorByTwitterId(curedTwitterUserId);
            // Nothing's worked so far, skip this guess.
            if (!authorSelect) {
                errors.push(guess);
                continue;
            }
            authorId = authorSelect.authorId;
            twitterIdLookupCount++;
        }

        try {
            await insertTwitterGuess(authorId, guess);
            guessInsertCount++;
        } catch (error) {
            console.error(guess.text);
            console.error(error);
        }
    }

    console.log(`Encountered ${errors.length} bad tweet_guess_rows:`);
    console.log(errors);
    console.log(`Added ${guessInsertCount} new Guess records.`);
    const audienceIdMatchCount = guessInsertCount - twitterIdLookupCount;
    console.log(`Did ~${audienceIdMatchCount} successful row ID lookups.`);
    const twitterIdMatchCount = audienceIdLookupCount - audienceIdMatchCount;
    console.log(`Did ~${twitterIdMatchCount} successful twitterID lookups.\n`);
};
const getAuthorByTwitterId = (twitterId) =>
    db.get(`SELECT authorId FROM Authors WHERE twitterId = ?`, twitterId);
const insertTwitterGuess = (authorId, guess) => {
    const type = guess.url === 'direct-message' ? 1 : 0;
    const text = guess.text;
    const correct = guess.correct === '1';
    const bonusPoint = guess.bonus_points === '1';
    const tweetId = guess.url.match(/\d*$/)[0] || undefined;

    return db.run(
        `INSERT INTO Guesses
        (authorId, episodeId, type, text, correct, bonusPoint, tweetId)
        VALUES (?, ?, ?, ?, ?, ?, ?);`,
        authorId,
        archiveEpisodeId,
        type,
        text,
        correct,
        bonusPoint,
        tweetId,
    );
};

/*-------------*\
  EMAIL GUESSES
\*-------------*/
const importEmailGuesses = async (audienceIds) => {
    const records = loadCSV('./.data/anvil-imports/guess-email.csv');
    console.log(`Loaded ${records.length} email_guess_rows.`);

    let emailLookupFailCount = 0;
    const errors = [];
    let guessInsertCount = 0;
    let authorInsertCount = 0;
    let authorUpdateCount = 0;

    for (guess of records) {
        // Parse the body of the email
        const {parsedElements, errors: parseErrors} = parseTextContent(
            guess.text,
        );
        if (parseErrors) continue;

        let authorId;
        // Look up by email address
        if (parsedElements.email) {
            const authorSelect = await getAuthorByEmailAddress(
                parsedElements.email,
            );
            if (authorSelect) {
                authorId = authorSelect.lastID;
            } else emailLookupFailCount++;
        }
        // Look up by Anvil row id
        if (!authorId && guess.audience) {
            const rowId = guess.audience.slice(4); // Remove "#ROW"
            authorId = audienceIds[rowId];
        }
        // Insert new Author
        if (!authorId) {
            const authorInsert = await insertEmailAuthor(parsedElements);
            authorId = authorInsert.lastID;
            authorInsertCount++;
        }

        try {
            // insert guess
            await insertEmailGuess(authorId, guess);
            guessInsertCount++;

            // Update email
            const authorEmailUpdate = await updateAuthorEmail(
                authorId,
                parsedElements,
            );
            authorUpdateCount += authorEmailUpdate.changes;

            // Update nick
            const authorNickUpdate = await updateAuthorEmailNick(
                authorId,
                parsedElements,
            );
            authorUpdateCount += authorNickUpdate.changes;
        } catch (error) {
            console.error(guess.text);
            console.error(error);
        }
    }

    console.log(`Encountered ${errors.length} bad email guesses`);
    console.log(errors);
    console.log(`Added ${guessInsertCount} new Guess records.`);
    console.log(`Email lookup failed ${emailLookupFailCount} times.`);
    console.log(`Updated ${authorUpdateCount} Author records.\n`);
};
const getAuthorByEmailAddress = (emailAddress) =>
    db.get(
        `SELECT authorId FROM Authors WHERE emailAddress = ?;`,
        emailAddress,
    );
const insertEmailGuess = (authorId, guess) => {
    const text = guess.text;
    const correct = guess.correct === '1';
    const bonusPoint = guess.bonus_points === '1';

    return db.run(
        `INSERT INTO Guesses
        (authorId, episodeId, type, text, correct, bonusPoint)
        VALUES (?, ?, ?, ?, ?, ?);`,
        authorId,
        archiveEpisodeId,
        2,
        text,
        correct,
        bonusPoint,
    );
};
const insertEmailAuthor = (parsedElements) =>
    db.run(
        `INSERT INTO Authors
        (emailAddress, callsign)
        VALUES (?, ?);`,
        parsedElements.email,
        parsedElements.nick.trim(),
    );
const updateAuthorEmail = (authorId, parsedElements) =>
    db.run(
        `UPDATE OR IGNORE Authors
        SET emailAddress = ?
        WHERE authorId = ?;`,
        parsedElements.email,
        authorId,
    );
const updateAuthorEmailNick = (authorId, parsedElements) =>
    db.run(
        `UPDATE Authors
        SET callsign = ?
        WHERE authorId = ?;`,
        parsedElements.nick,
        authorId,
    );

/*-----------------------*\
  EMAIL PARSING UTILITIES
\*-----------------------*/
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

importAll();

/*
DUPLICATES IN ANVIL AUDIENCES:
{
    ID: '[105119,143440254]',
    nickname: 'Peter McMally',
    twitter_screen_name: 'PeterMcMally',
    twitter_user_id: '891058134524936193',
    correct: '3',
    bonus_points: '18',
    aliases: '["Sci kyle","SkiKyle","SciKyle","Kyle Foster","Peter McMally","kyle foster","PeterMcMally"]',
}
{
    ID: '[105119,143440245]',
    nickname: 'PeterMcMally',
    twitter_screen_name: 'PeterMcMally',
    twitter_user_id: '891058134524936200', // NOT VALID ID
    correct: '0',
    bonus_points: '0',
    aliases: '["Peter McMally","PeterMcMally"]',
}






{
    ID: '[105119,143440248]',
    nickname: 'Wedemark Space Agency',
    twitter_screen_name: 'WedemarkSpace',
    twitter_user_id: '1324973233448300500', // NOT VALID ID
    correct: '0',
    bonus_points: '0',
    aliases: '["Julien and Felix","WedemarkSpace","Wedemark Space Agency","Team Wedemark","Wedemark","Julien Marten"]',
}
{
    ID: '[105119,143440256]',
    nickname: 'Wedemark Space Agency',
    twitter_screen_name: 'WedemarkSpace',
    twitter_user_id: '1324973233448300545',
    correct: '1',
    bonus_points: '7',
    aliases: '["Julien and Felix","WedemarkSpace","Wedemark Space Agency","Team Wedemark","Wedemark","Julien Marten"]',
}







{
    ID: '[105119,143440253]',
    nickname: 'Hotstuf McTottlepots',
    twitter_screen_name: 'HotStuffMcTottl',
    twitter_user_id: '730127769468690400', // NOT VALID ID
    correct: '0',
    bonus_points: '2',
    email: '',
    created_on: '2021-02-12A20:53:21.780348+0000',
    created_by_member: '0',
    modified_on: '2021-02-12A20:53:21.780348+0000',
    aliases: '["HotStuffMcTottl","Hotstuf McTottlepots"]',
    notes: '',
    enabled: '0',
    password_hash: '',
    remembered_logins: 'null',
    last_login: ''
}
{
    ID: '[105119,216976897]',
    nickname: 'Hotstuf McTottlepots',
    twitter_screen_name: 'HotStuffMcTottl',
    twitter_user_id: '730127769468690432',
    correct: '1',
    bonus_points: '3',
    email: '',
    created_on: '2021-06-20A15:48:22.000748+0000',
    created_by_member: '0',
    modified_on: '2021-06-20A15:48:22.000749+0000',
    aliases: '["Hotstuf McTottlepots","HotStuffMcTottl"]',
    notes: '',
    enabled: '0',
    password_hash: '',
    remembered_logins: 'null',
    last_login: ''
}
*/
