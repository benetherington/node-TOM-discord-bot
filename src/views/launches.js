/*---*\
  API
\*---*/
const LL2BaseTest = 'https://lldev.thespacedevs.com/2.2.0/';
const LL2Base = 'https://ll.thespacedevs.com/2.2.0/';
const getUpcomingLaunches = async () => {
    const url = new URL(LL2Base);
    url.pathname += 'launch/upcoming/';
    url.searchParams.append('hide_recent_previous', true);
    url.searchParams.append('ordering', 'window_start');
    url.searchParams.append('mode', 'detailed');

    const response = await fetch(url, {headers: {Accept: 'application/json'}});
    return response.json();
};
const getNextPage = async (next) => {
    const response = await fetch(next, {headers: {Accept: 'application/json'}});
    return response.json();
};

/*------------*\
  GUI BUILDERS
\*------------*/
const dateOptions = {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'utc',
};
const buildLaunchRow = (launchData) => {
    // Assemble information to display
    const moreHref = `https://spacelaunchnow.me/launch/${launchData.slug}`;
    const windowStart = new Date(launchData.window_start);
    const windowStartStr = windowStart.toLocaleString('en-US', dateOptions);
    const windowEnd = new Date(launchData.window_end);
    const windowEndStr = windowEnd.toLocaleString('en-US', dateOptions);
    const statusName = launchData.status.name;
    const statusDescription = launchData.status.description;
    const updates = launchData.updates.map((update) => ({
        text: update.comment,
        href: update.info_url,
        date: new Date(update.created_on),
    }));

    const companyName = launchData.launch_service_provider.name;
    const totalLaunchCount =
        launchData.launch_service_provider.total_launch_count;
    const consecutiveLaunchCount =
        launchData.launch_service_provider.consecutive_successful_launches;
    const companyLogoImage = launchData.launch_service_provider.logo_url;
    const companyImage = launchData.launch_service_provider.image_url;

    const rocketName = launchData.rocket.configuration.full_name;
    const rocketVariant = launchData.rocket.configuration.variant;
    const rocketImage = launchData.rocket.configuration.image_url;

    const missionName = launchData.mission.name;
    const missionDescription = launchData.mission.description;
    const missionOrbit = launchData.mission.orbit
        ? launchData.mission.orbit.name
        : '';
    const missionPatchImage = launchData.mission_patches.length
        ? launchData.mission_patches[0].image_url
        : null;

    const launchPadName = launchData.pad.name;
    const launchPadCount = launchData.pad.total_launch_count;
    const launchLocation = launchData.pad.location.name;
    const launchLocationCount = launchData.pad.location.total_launch_count;

    const heroImageUrl =
        missionPatchImage || companyLogoImage || companyImage || rocketImage;

    // Build HTML elements
    const rowContainer = document.createElement('div');
    rowContainer.classList.add('row-container');
    rowContainer.classList.add('card');

    const heroLink = document.createElement('a');
    heroLink.classList.add('hero-link');
    heroLink.href = moreHref;
    heroLink.style = `background-image: url(${heroImageUrl})`;
    rowContainer.append(heroLink);

    // const heroImage = document.createElement('img');
    // heroImage.src = heroImageUrl;
    // heroLink.append(heroImage);

    // Launch window -- times
    const timesSection = document.createElement('div');
    timesSection.classList.add('window-times');
    rowContainer.append(timesSection);

    const startTime = document.createElement('p');
    startTime.classList.add('start');
    startTime.innerText = windowStartStr;
    if (windowStartStr !== windowEndStr) {
        startTime.innerText += ` --to-- ${windowEndStr}`;
    }
    timesSection.append(startTime);

    // const toSeparator = document.createElement('p');
    // toSeparator.classList.add('to-separator');
    // toSeparator.innerText = '---to---';
    // timesSection.append(toSeparator);

    // const endTime = document.createElement('p');
    // endTime.classList.add('end');
    // endTime.innerText = windowEndStr;
    // timesSection.append(endTime);

    // Launch window -- status
    const statusBadge = document.createElement('div');
    statusBadge.classList.add('window-status', 'card');
    rowContainer.append(statusBadge);

    const statusNameEl = document.createElement('p');
    statusNameEl.classList.add('status-name');
    statusNameEl.innerText = statusName;
    statusBadge.append(statusNameEl);

    const statusDescriptionEl = document.createElement('p');
    statusDescriptionEl.classList.add('status-description');
    statusDescriptionEl.innerText = statusDescription;
    statusBadge.append(statusDescriptionEl);

    // Launch window -- updates
    const updatesContainer = document.createElement('div');
    updatesContainer.classList.add('window-updates', 'card', 'has-header');
    rowContainer.append(updatesContainer);

    updates.forEach((update) => {
        const updateLink = document.createElement('a');
        updateLink.href = update.href;
        updateLink.innerText =
            update.date.toLocaleDateString('en-US', {
                dateStyle: 'short',
            }) +
            ': ' +
            update.text;
        updatesContainer.append(updateLink);
    });

    // Rocket
    const rocketSection = document.createElement('div');
    rocketSection.classList.add('rocket', 'card', 'has-header');
    rowContainer.append(rocketSection);

    const rocketNameEl = document.createElement('p');
    rocketNameEl.classList.add('name');
    rocketNameEl.innerText = rocketName + ' ' + rocketVariant;
    rocketSection.append(rocketNameEl);

    const companyNameEl = document.createElement('p');
    companyNameEl.classList.add('company-name');
    companyNameEl.innerText = companyName;
    rocketSection.append(companyNameEl);

    const totalCountEl = document.createElement('p');
    totalCountEl.classList.add('total-launch');
    totalCountEl.innerText = totalLaunchCount;
    rocketSection.append(totalCountEl);

    const consecutiveCountEl = document.createElement('p');
    consecutiveCountEl.classList.add('consecutive-launch');
    consecutiveCountEl.innerText = consecutiveLaunchCount;
    rocketSection.append(consecutiveCountEl);

    // Mission
    const missionSection = document.createElement('div');
    missionSection.classList.add('mission', 'card', 'has-header');
    rowContainer.append(missionSection);

    const missionNameEl = document.createElement('p');
    missionNameEl.classList.add('name');
    missionNameEl.innerText = missionName;
    missionSection.append(missionNameEl);

    const missionDescriptionEl = document.createElement('p');
    missionDescriptionEl.classList.add('description');
    missionDescriptionEl.innerText = missionDescription;
    missionSection.append(missionDescriptionEl);

    if (missionOrbit && missionOrbit !== 'Unknown') {
        const missionOrbitEl = document.createElement('p');
        missionOrbitEl.classList.add('orbit');
        missionOrbitEl.innerText = missionOrbit;
        missionSection.append(missionOrbitEl);
    }

    // Launch site
    const siteSection = document.createElement('div');
    siteSection.classList.add('site', 'card', 'has-header');
    rowContainer.append(siteSection);

    // Launch site -- location
    const siteLocationSection = document.createElement('div');
    siteLocationSection.classList.add('location');
    siteSection.append(siteLocationSection);

    const locationName = document.createElement('p');
    locationName.classList.add('name');
    locationName.innerText = launchLocation;
    siteLocationSection.append(locationName);

    const locationCount = document.createElement('p');
    locationCount.classList.add('count');
    locationCount.innerText = launchLocationCount;
    siteLocationSection.append(locationCount);

    // Launch site -- pad
    const sitePadSection = document.createElement('div');
    sitePadSection.classList.add('pad');
    siteSection.append(sitePadSection);

    const padName = document.createElement('p');
    padName.classList.add('name');
    padName.innerText = launchPadName;
    sitePadSection.append(padName);

    const padCount = document.createElement('p');
    padCount.classList.add('count');
    padCount.innerText = launchPadCount;
    sitePadSection.append(padCount);

    return rowContainer;
};
const buildLoadingIndicator = () => {
    const loadingContainer = document.createElement("div")
    loadingContainer.classList.add("spinner-container")
    
    const loadingEl = document.createElement('div');
    loadingEl.classList.add('spinner');
    loadingContainer.append(loadingEl)
    
    return loadingContainer;
};

/*-------------*\
  EVENT HELPERS
\*-------------*/
const nextTuesday = () => {
    // Figure out when Tuesday is
    const d = new Date();
    let daysToNextTuesday =
        (-d.getDay() + // Start from today
            7 + // Go one week forward
            2) % // Tuesday is day 2
        7;
    daysToNextTuesday ||= 7; // If today is tuesday, 7%7 isn't right
    // Update and return the Date
    d.setDate(d.getDate() + daysToNextTuesday);
    d.setHours(15);
    d.setMinutes(0);
    d.setSeconds(0);
    return d;
};
const secondWednesday = () => {
    // Figure out when Tuesday is
    const d = nextTuesday();
    // Fast forward to the following Wednesday
    d.setDate(d.getDate() + 8);
    return d;
};

const getLaunchesForWeek = async function* () {
    let done = false;
    const weekStart = nextTuesday();
    const weekEnd = secondWednesday();
    let {next, results} = await getUpcomingLaunches();

    while (!done) {
        // Check each result, and stop fetching once we've gone out of the window
        for (launch of results) {
            const windowStart = new Date(launch.window_start);
            const tooEarly = windowStart < weekStart;
            const tooLate = windowStart > weekEnd;
            if (!tooEarly && !tooLate) {
                yield Promise.resolve(launch);
            } else if (tooLate) {
                done = true;
            }
        }

        // Fetch next
        if (next) ({next, results} = await getNextPage(next));
        else done = true;
    }
};

const displayUpcomingLaunches = async () => {
    const loadingEl = buildLoadingIndicator();
    document.getElementById('launch-table').append(loadingEl);

    for await (const launch of getLaunchesForWeek()) {
        const launchRow = buildLaunchRow(launch);
        loadingEl.before(launchRow);
    }
    
    loadingEl.remove()
};
const updateSearchWindow = () => {
    const start = nextTuesday().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    });
    const end = secondWednesday().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    });

    const searchText = `Displaying launches from ${start} to ${end}`;
    document.getElementById('search-window').innerText = searchText;
};

/*------------------*\
  GUI EVENT HANDLERS
\*------------------*/

document.addEventListener('DOMContentLoaded', () => {
    displayUpcomingLaunches();
    updateSearchWindow();
});
