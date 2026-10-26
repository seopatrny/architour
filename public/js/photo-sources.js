/* Which Wikipedia articles to pull each building's photo from.
 * Shared by the game (browser) and the server. Teachers can pick a different photo
 * for any building on the teacher page (/admin.html → Building photos). */
(function (root) {
  // Wikipedia article titles to try, in order (redirects are followed)
  const WIKI = {
    lakepoint: ['Lake Point Tower'],
    aqua: ['Aqua (skyscraper)', 'Aqua Tower'],
    stregis: ['St. Regis Chicago', 'Vista Tower'],
    nbc: ['NBC Tower'],
    crain: ['Crain Communications Building', 'Smurfit-Stone Building'],
    aon: ['Aon Center (Chicago)'],
    twopru: ['Two Prudential Plaza'],
    hancock: ['875 North Michigan Avenue', 'John Hancock Center'],
    tribune: ['Tribune Tower'],
    wrigley: ['Wrigley Building'],
    london: ['London Guarantee Building'],
    carbide: ['Carbide & Carbon Building'],
    jewelers: ['35 East Wacker', 'Jewelers Building'],
    mather: ['Mather Tower'],
    trump: ['Trump International Hotel and Tower (Chicago)'],
    amaplaza: ['AMA Plaza', '330 North Wabash'],
    marina: ['Marina City'],
    reidmurdoch: ['Reid, Murdoch & Co. Building', 'Reid Murdoch Building'],
    leoburnett: ['Leo Burnett Building'],
    wacker333: ['333 Wacker Drive'],
    mart: ['Merchandise Mart'],
    salesforce: ['Salesforce Tower Chicago', 'Wolf Point (Chicago)'],
    riverpoint: ['River Point'],
    riverside150: ['150 North Riverside'],
    bofa110: ['110 North Wacker'],
    boeing: ['100 North Riverside', 'Boeing International Headquarters'],
    opera: ['Civic Opera House'],
    dailynews: ['Chicago Daily News Building', 'Riverside Plaza (Chicago)'],
    boardoftrade: ['Chicago Board of Trade Building'],
    willis: ['Willis Tower'],
    unionstation: ['Chicago Union Station'],
    franklin: ['Franklin Center (Chicago)'],
    wacker311: ['311 South Wacker Drive'],
    postoffice: ['Old Chicago Main Post Office', 'Old Post Office (Chicago)'],
  };

  // Search words for Wikimedia Commons, used when an article's main photo is missing or is an
  // inside view, and always for the buildings in PREFER_SEARCH (their article photo was a poor pick).
  const SEARCH = {
    aqua: 'Aqua Tower Chicago',
    opera: 'Civic Opera House Chicago river exterior',
    unionstation: 'Chicago Union Station exterior Canal Street',
    amaplaza: '330 North Wabash AMA Plaza Chicago',
    riverside150: '150 North Riverside Chicago',
  };
  const PREFER_SEARCH = ['aqua', 'opera', 'unionstation', 'amaplaza', 'riverside150'];

  const api = { WIKI, SEARCH, PREFER_SEARCH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PhotoSources = api;
})(typeof window !== 'undefined' ? window : globalThis);
