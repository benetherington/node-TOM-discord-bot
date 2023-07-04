const sanitizeContent = (text) =>
    text.replaceAll(
        /<\/?(p|span|br|a|del|pre|code|em|strong|b|i|u|ul|ol|li|blockquote)( [^>]*)?>/gi,
        '',
    );
const safeParseContent = (text) => {
    const elements = [];

    while (text.length) {
        const hrefRe =
            /(?<before>.*?)(<a href="(?<href>[^"]*?)".*?>(?<link>.*?)<\/a>)/gi;
        const hrefMatch = hrefRe.exec(text);
        text = text.slice(hrefRe.lastIndex);

        if (hrefMatch) {
            const {before, href, link} = hrefMatch.groups;

            elements.push(sanitizeContent(before));

            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.innerText = sanitizeContent(link);
            elements.push(anchor);
        } else {
            elements.push(sanitizeContent(text));
            break;
        }
    }

    return elements;
};
const getLinkHref = (guess) => {
    if (guess.type === guessTypes.TWEET) {
        return 'https://www.twitter.com/twitter/status/' + guess.tweetId;
    } else if (guess.type === guessTypes.TWITTER_DM) {
        return 'https://twitter.com/messages/2827032970-' + guess.tweetId;
    } else if (guess.type === guessTypes.TOOT) {
        const [_, userName, instanceName] =
            guess.mastodonUsername.match(/(.*)@(.*)/);
        return `https://${instanceName}/@${userName}/${guess.tootId}`;
    } else if (guess.type === guessTypes.DISCORD && guess.discordReplyId) {
        return (
            'https://discord.com/channels/137948573605036033/934901291644256366/' +
            guess.discordReplyId
        );
    } else return '';
};
