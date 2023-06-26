const fetch = require('node-fetch');

const getPeers = async (instance) => {
    const path = '/api/v1/instance/peers';
    const url = instance + path;

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error(
            `Encountered ${resp.statusText} when fetching peers from ${instance}`,
        );
        return [];
    }

    const jsn = await resp.json();
    return jsn;
};

if (require.main === module) {
    // const instance = 'http://spacey.space';
    const instance = 'https://octodon.social';

    getPeers(instance);
}
