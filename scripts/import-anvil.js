const fs = require('fs');
const {parse} = require('csv-parse/sync');
const public = require('../database/public');
const {guessTypes} = require('../database/twsf');

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
let db;
const importAll = async () => {
    db = await public;

    // Update discord callsigns
    await db.run(
        `UPDATE Authors
        SET callsign = displayName
        WHERE callsign IS NULL;`,
    );

    // Do Anvil imports
    const audiences = importAudience();
    const tweets = importTwitterGuesses();
    const emails = importEmailGuesses().filter((e) => e);

    enrichAuthors(audiences, tweets);
    enrichAuthors(audiences, emails);

    emails.forEach(addImportedEmail);
    tweets.forEach(addImportedTweet);
};

/*---------*\
  UTILITIES
\*---------*/
const enrichAuthors = (audiences, guessesAndAuthors) => {
    const possibles = [];
    for (guessAndAuthor of guessesAndAuthors) {
        possibles.push(enrichAuthor(audiences, guessAndAuthor));
    }
    return possibles.filter((v) => v);
};
const enrichAuthor = (audiences, {guess, author}) => {
    const {audience, possibleAudiences} = findAudience(audiences, author);
    if (audience) {
        author.twitterId ||= audience.twitterId;
        author.twitterUsername ||= audience.twitterUsername;
        author.emailAddress ||= audience.emailAddress;
        author.callsign ||= audience.callsign;

        author.created_at = audience.created_at;
        author.notes = audience.notes;
        author.anvilScore = audience.anvilScore;
    }
    if (possibleAudiences) return {author, possibleAudiences};
};
const findAudience = (audiences, author) => {
    // ANVIL ROW ID
    if (author.audienceRowId) {
        const audience = audiences.find(
            (audience) => audience.rowId === author.audienceRowId,
        );
        if (audience) return {audience};
    }

    // TWITTER
    if (author.twitterId) {
        const audience = audiences.find(
            (audience) => audience.twitterId === author.twitterId,
        );
        if (audience) return {audience};
    }
    if (author.twitterUsername) {
        const audience = audiences.find(
            (audience) => audience.twitterUsername === author.twitterUsername,
        );
        if (audience) return {audience};
    }

    // EMAIL
    if (author.emailAddress) {
        const audience = audiences.find(
            (audience) => audience.emailAddress === author.emailAddress,
        );
        if (audience) return {audience};
    }

    // CALLSIGN
    if (author.callsign) {
        const audience = audiences.find(
            (audience) => audience.callsign === author.callsign,
        );
        if (audience) return {audience};
    }

    // LAST DITCH: ALIASES
    const possibleAudiences = audiences.filter((audience) =>
        audience.aliases.includes(author.callsign),
    );
    if (possibleAudiences.length === 1) {
        return {audience: possibleAudiences[0]};
    } else return {possibleAudiences};
};
//                 2022-05-22A11:33:49.000207+0000
const toDbDateTime = (anvil) =>
    anvil.slice(0, 10) + // 2022-05-22
    ' ' + // Skip the A
    anvil.slice(11, 19); // 11:33:49
const addImportedEmail = async ({guess, author}) => {
    const {lastID: authorId} = await db.run(
        `INSERT INTO Authors
            (emailAddress, emailName, callsign)
        VALUES (?, ?, ?)
        ON CONFLICT (emailAddress)
        DO UPDATE SET
            emailName = excluded.emailName,
            callsign = excluded.callsign;`,
        author.emailAddress,
        author.emailName,
        author.callsign,
    );
    await db.run(
        `INSERT OR IGNORE INTO Guesses (
            episodeId,
            authorId,
            type,
            text,
            correct,
            bonusPoint,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        0,
        authorId,
        guess.type,
        guess.text,
        guess.correct,
        guess.bonusPoint,
        guess.created_at,
    );
};
const addImportedTweet = async ({guess, author}) => {
    const {lastID: authorId} = await db.run(
        `INSERT INTO Authors
            (twitterId, twitterUsername, twitterDisplayName, callsign)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (twitterId)
        DO UPDATE SET
            twitterDisplayName = excluded.twitterDisplayName,
            callsign = excluded.callsign
        ON CONFLICT (twitterUsername)
        DO UPDATE SET
            twitterDisplayName = excluded.twitterDisplayName,
            callsign = excluded.callsign;`,
        author.twitterId,
        author.twitterUsername,
        author.twitterDisplayName,
        author.callsign,
    );
    await db.run(
        `INSERT OR IGNORE INTO Guesses (
            episodeId,
            authorId,
            type,
            text,
            tweetId,
            correct,
            bonusPoint,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        0,
        authorId,
        guess.type,
        guess.text,
        guess.tweetId,
        guess.correct,
        guess.bonusPoint,
        guess.created_at,
    );
};

/*---------------*\
  AUDIENCE IMPORT
\*---------------*/
const twitterIdFixes = {
    891058134524936200: '891058134524936193',
    1324973233448300500: '1324973233448300545',
    730127769468690400: '730127769468690432',
};
const importAudience = () => {
    const records = loadCSV('./.data/anvil-imports/audience.csv');
    console.log(`Loaded ${records.length} audience_rows.`);

    return records.map(createAudience);
};
const createAudience = (audience) => {
    const rowId = audience.ID;
    const twitterId =
        twitterIdFixes[audience.twitter_user_id] ||
        audience.twitter_user_id ||
        undefined;
    const twitterUsername = audience.twitter_screen_name || undefined;
    const emailAddress = audience.email || undefined;
    const callsign = audience.nickname || twitterUsername || '';
    const notes = audience.notes;
    const anvilScore = [audience.correct, audience.bonus_points];
    const aliases = audience.aliases;

    return {
        rowId,
        twitterId,
        twitterUsername,
        emailAddress,
        callsign,
        notes,
        anvilScore,
        aliases,
    };
};

/*--------------*\
  TWITTER IMPORT
\*--------------*/
const importTwitterGuesses = (audiencesAndRowIds) => {
    const records = loadCSV('./.data/anvil-imports/guess-twitter.csv');
    console.log(`Loaded ${records.length} tweet_guess_rows`);

    return records.map(formatTwitterGuess);
};
const formatTwitterGuess = (anvilGuess) => {
    const type =
        anvilGuess.url === 'direct-message'
            ? guessTypes.TWITTER_DM
            : guessTypes.TWEET;
    const tweetId = anvilGuess.url.match(/\d*$/)[0] || undefined;
    const text = anvilGuess.text;
    const correct = anvilGuess.correct === '1';
    const bonusPoint = anvilGuess.bonus_points === '1';
    const created_at = toDbDateTime(anvilGuess.retrieved_on);
    const guess = {
        type,
        tweetId,
        text,
        correct,
        bonusPoint,
        created_at,
    };

    const audienceRowId = anvilGuess.audience.slice(4);
    const twitterId =
        twitterIdFixes[anvilGuess.twitter_user_id] ||
        anvilGuess.twitter_user_id ||
        undefined;
    const twitterUsername = anvilGuess.twitter_screen_name || undefined;
    const callsign = anvilGuess.nickname || twitterUsername || '';
    const author = {
        audienceRowId,
        twitterId,
        twitterUsername,
        callsign,
    };

    return {guess, author};
};

/*------------*\
  EMAIL IMPORT
\*------------*/
const importEmailGuesses = (audiencesAndRowIds) => {
    const records = loadCSV('./.data/anvil-imports/guess-email.csv');
    console.log(`Loaded ${records.length} email_guess_rows.`);

    return records.map(formatEmailGuess);
};
const formatEmailGuess = (anvilGuess) => {
    const {parsedElements, errors: parseErrors} = parseTextContent(
        anvilGuess.text,
    );
    if (parseErrors) return;
    const text = anvilGuess.text;
    const correct = anvilGuess.correct === '1';
    const bonusPoint = anvilGuess.bonus_points === '1';
    const created_at = toDbDateTime(anvilGuess.recieved_on);
    const guess = {
        type: guessTypes.EMAIL,
        text,
        correct,
        bonusPoint,
        created_at,
    };

    const audienceRowId = anvilGuess.audience.slice(4);
    const emailAddress = parsedElements.email;
    const emailName = parsedElements.nick;
    const callsign = emailName;
    const author = {audienceRowId, emailAddress, emailName, callsign};

    return {guess, author};
};

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
