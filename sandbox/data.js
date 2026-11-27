/* SANDBOX DUMMY DATA (branch home/streamline). Nothing here is read from Drive, the share store
   or a studio; it lives in this browser under localStorage 'pds-sandbox-v1' and Reset puts it back.
   People, campaigns and posts are made up for testing.

   The model the sandbox proposes:
     job    a campaign (kind 'cas') or a post (kind 'ops')
     piece  one thing to make inside a job: audience x language (a post is a single piece)
     st     locked (Arabic, until its English is approved) | todo | draft (a post, with social media)
            | design | review | ready
     with   the one person a piece is waiting on                                                   */
window.SB_SEED = function (now) {
  var H = 36e5, D = 864e5;
  function pc(id, aud, lang, st, w, x) {
    var p = { id: id, aud: aud, lang: lang, st: st, with: w || null, sentBy: null, sentAt: 0, note: null, dl: false, ph: null, checks: null };
    for (var k in (x || {})) p[k] = x[k];
    return p;
  }
  var EN = { h: 'Waterfront living, measured returns', s: 'From AED 1.9M · 60/40 payment plan · Handover Q4 2028', c: 'Register your interest' };
  var AR = { h: 'حياة على الواجهة البحرية، عوائد مدروسة', s: 'ابتداءً من 1.9 مليون درهم · خطة سداد 60/40', c: 'سجّل اهتمامك' };
  return {
    people: [
      { id: 'kel', n: 'Kelvin Inigo', role: 'designer', admin: true },
      { id: 'ais', n: 'Aisha Rahman', role: 'designer' },
      { id: 'den', n: 'Dennis Bugos', role: 'pm' },
      { id: 'pri', n: 'Priya Nair', role: 'cten' },
      { id: 'oma', n: 'Omar Saleh', role: 'ctar' },
      { id: 'lay', n: 'Layla Haddad', role: 'smm' }
    ],
    jobs: [
      { id: 'samana', kind: 'cas', name: 'Samana Collecta · The World', by: 'den', designer: 'kel', due: now + 3 * D, made: now - 4 * D, live: 0,
        thumb: 'campaign-d', copy: { EN: EN, AR: AR },
        brief: 'Launch of the Collecta residences on The World islands. Lead with the private-island address and the 60/40 plan. Families want space and schools; investors want yield and handover date.',
        pieces: [
          pc('p1', 'Local · Family', 'EN', 'design', 'kel', { sentBy: 'kel', note: { t: 'The headline runs to three lines on the 9:16. Can it be six words or fewer?', by: 'pri', at: now - 2 * H, ask: true } }),
          pc('p2', 'Local · Family', 'AR', 'locked'),
          pc('p3', 'Local · Investor', 'EN', 'todo', 'kel'),
          pc('p4', 'Local · Investor', 'AR', 'locked'),
          pc('p5', 'International · Investor', 'EN', 'review', 'pri', { sentBy: 'kel', sentAt: now - 3 * H })
        ],
        extras: [{ k: 'anim', n: 'Animated', sub: '1:1 and 9:16', done: false }, { k: 'video', n: 'MVP video', sub: 'From the Video Studio', done: false }],
        log: [
          { at: now - 4 * D, by: 'den', t: 'Sent the brief to Kelvin Inigo' },
          { at: now - 6 * H, by: 'kel', t: 'Sent Local · Family · English for copy check to Priya Nair' },
          { at: now - 3 * H, by: 'kel', t: 'Sent International · Investor · English for copy check to Priya Nair' },
          { at: now - 2 * H, by: 'pri', t: 'Asked for a change on Local · Family · English' }
        ] },
      { id: 'rock', kind: 'cas', name: 'Rockefeller Tower', by: 'den', designer: 'kel', due: now + 5 * D, made: now - 6 * H, live: 0,
        thumb: 'campaign-f', copy: { EN: { h: 'An address with a name', s: 'Office floors on Sheikh Zayed Road · From AED 4,000 per sq ft', c: 'Book a viewing' }, AR: AR },
        brief: 'Office floors in the first Rockefeller-branded tower outside the US. Lead with the name and the address on Sheikh Zayed Road; prices from AED 4,000 per sq ft. Two audiences: business owners buying to occupy, and investors.',
        pieces: [
          pc('p1', 'Local · Investor', 'EN', 'todo', 'kel'),
          pc('p2', 'Local · Investor', 'AR', 'locked'),
          pc('p3', 'International · Investor', 'EN', 'todo', 'kel')
        ],
        extras: [{ k: 'anim', n: 'Animated', sub: '1:1 and 9:16', done: false }, { k: 'video', n: 'MVP video', sub: 'From the Video Studio', done: false }],
        log: [{ at: now - 6 * H, by: 'den', t: 'Sent the brief to Kelvin Inigo' }] },
      { id: 'palm', kind: 'cas', name: 'Palm Springs by Nakheel', by: 'den', designer: 'ais', due: now + 6 * D, made: now - 19 * D, live: 0,
        thumb: 'campaign-g', copy: { EN: EN, AR: AR }, phases: ['Teaser', 'Launch'],
        brief: 'Two phases. Teaser is unbranded curiosity; Launch names Nakheel and the price. Brief and floor plans are in the Drive folder.',
        pieces: [
          pc('t1', 'Local · Family', 'EN', 'ready', 'den', { ph: 'Teaser', dl: true, sentBy: 'ais' }),
          pc('t2', 'Local · Family', 'AR', 'ready', 'den', { ph: 'Teaser', sentBy: 'ais' }),
          pc('t3', 'Local · Investor', 'EN', 'ready', 'den', { ph: 'Teaser', dl: true, sentBy: 'ais' }),
          pc('l1', 'Local · Family', 'EN', 'design', 'ais', { ph: 'Launch' }),
          pc('l2', 'Local · Family', 'AR', 'locked', null, { ph: 'Launch' }),
          pc('l3', 'Local · Investor', 'EN', 'review', 'pri', { ph: 'Launch', sentBy: 'ais', sentAt: now - 20 * H })
        ],
        extras: [{ k: 'anim', n: 'Animated', sub: '1:1 and 9:16', done: true }, { k: 'video', n: 'MVP video', sub: 'From the Video Studio', done: false }],
        log: [
          { at: now - 19 * D, by: 'den', t: 'Sent the brief to Aisha Rahman' },
          { at: now - 12 * D, by: 'pri', t: 'Approved Teaser · Local · Family · English' },
          { at: now - 11 * D, by: 'oma', t: 'Approved Teaser · Local · Family · Arabic' },
          { at: now - 11 * D, by: 'den', t: 'Downloaded 2 designs' },
          { at: now - 20 * H, by: 'ais', t: 'Sent Launch · Local · Investor · English for copy check to Priya Nair' }
        ] },
      { id: 'sobha', kind: 'cas', name: 'Sobha Hartland II', by: 'den', designer: 'ais', due: now + 1 * D, made: now - 9 * D, live: 0,
        thumb: 'campaign-h', copy: { EN: { h: 'Lagoon mornings, city evenings', s: 'Villas from AED 8.2M · Ready 2027', c: 'See the floor plans' }, AR: AR },
        brief: 'Family villas on the lagoon. English first so it can go live this week; Arabic follows.',
        pieces: [
          pc('p1', 'Local · Family', 'EN', 'ready', 'den', { sentBy: 'ais' }),
          pc('p2', 'Local · Family', 'AR', 'review', 'oma', { sentBy: 'ais', sentAt: now - 5 * H, note: { t: 'Second line is a literal translation, please check it reads naturally.', by: 'ais', at: now - 5 * H } }),
          pc('p3', 'International · Investor', 'EN', 'ready', 'den', { sentBy: 'ais' })
        ],
        extras: [{ k: 'anim', n: 'Animated', sub: '1:1 and 9:16', done: true }, { k: 'video', n: 'MVP video', sub: 'From the Video Studio', done: true }],
        log: [
          { at: now - 9 * D, by: 'den', t: 'Sent the brief to Aisha Rahman' },
          { at: now - 1 * D, by: 'pri', t: 'Approved Local · Family · English' },
          { at: now - 1 * D, by: 'pri', t: 'Approved International · Investor · English' },
          { at: now - 5 * H, by: 'ais', t: 'Sent Local · Family · Arabic for translation check to Omar Saleh' }
        ] },
      { id: 'beyond', kind: 'cas', name: 'Beyond · Beachfront Living', by: 'den', designer: 'kel', due: now - 1 * D, made: now - 14 * D, live: 0,
        thumb: 'campaign-d', copy: { EN: EN, AR: AR },
        brief: 'Beachfront apartments, investor-led. One audience, both languages.',
        pieces: [
          pc('p1', 'Local · Investor', 'EN', 'ready', 'den', { dl: true, sentBy: 'kel' }),
          pc('p2', 'Local · Investor', 'AR', 'ready', 'den', { dl: true, sentBy: 'kel' })
        ],
        extras: [{ k: 'anim', n: 'Animated', sub: '1:1 and 9:16', done: true }, { k: 'video', n: 'MVP video', sub: 'From the Video Studio', done: true }],
        log: [{ at: now - 14 * D, by: 'den', t: 'Sent the brief to Kelvin Inigo' }, { at: now - 2 * D, by: 'den', t: 'Downloaded 2 designs' }] },
      { id: 'emaar', kind: 'cas', name: 'Emaar Beachfront · Sea Haven', by: 'den', designer: 'ais', due: now - 6 * D, made: now - 25 * D, live: now - 4 * D,
        thumb: 'campaign-f', copy: { EN: EN, AR: AR }, brief: 'Sea Haven tower launch.',
        pieces: [pc('p1', 'Local · Family', 'EN', 'ready', 'den', { dl: true }), pc('p2', 'Local · Family', 'AR', 'ready', 'den', { dl: true })],
        extras: [], log: [{ at: now - 4 * D, by: 'den', t: 'Marked it launched' }] },

      { id: 'villa', kind: 'ops', name: 'Just Listed · Palm Jumeirah villa', by: 'lay', designer: null, due: now + 2 * D, made: now - 3 * H, live: 0,
        thumb: 'organic-listed', tpl: 'Just listed', copy: { EN: { h: 'Just listed', s: 'Signature villa, Frond G · 6 bedrooms · AED 38M', c: 'Listing 4471' } },
        brief: 'Signature villa on Frond G, 6 bedrooms, AED 38M. Hero the sea view.',
        pieces: [pc('p1', 'Post', 'EN', 'draft', 'lay')], extras: [],
        log: [{ at: now - 3 * H, by: 'lay', t: 'Started the draft' }] },
      { id: 'rule', kind: 'ops', name: 'Reel thumbnail · The Golden Rule', by: 'lay', designer: 'kel', due: now + 3 * D, made: now - 2 * D, live: 0,
        thumb: 'organic-review', tpl: 'Reel thumbnail', copy: { EN: { h: 'The golden rule of buying off-plan', s: 'Three checks before you sign', c: '' } },
        brief: 'Cover for Thursday\'s reel. Short title, face on the right.',
        pieces: [pc('p1', 'Post', 'EN', 'design', 'kel', { sentBy: 'lay', sentAt: now - 2 * D })], extras: [],
        log: [{ at: now - 2 * D, by: 'lay', t: 'Sent the draft to Kelvin Inigo' }] },
      { id: 'agents', kind: 'ops', name: 'Top Agents of October', by: 'lay', designer: 'ais', due: now + 1 * D, made: now - 3 * D, live: 0,
        thumb: 'organic-agents', tpl: 'Top agents', copy: { EN: { h: 'Top agents of October', s: 'Five names, one month', c: '' } },
        brief: 'Carousel, five agents. Photos are in the team folder.',
        pieces: [pc('p1', 'Post', 'EN', 'design', 'ais', { sentBy: 'lay', sentAt: now - 3 * D })], extras: [],
        log: [{ at: now - 3 * D, by: 'lay', t: 'Sent the draft to Aisha Rahman' }] },
      { id: 'visa', kind: 'ops', name: 'Golden Visa success story', by: 'lay', designer: 'kel', due: now + 2 * H, made: now - 5 * D, live: 0,
        thumb: 'organic-review', tpl: 'Client review', copy: { EN: { h: '"We had our visas in five weeks"', s: 'A client story from Dubai Hills', c: 'Read the full story' } },
        brief: 'Four-page carousel from the client interview.',
        pieces: [pc('p1', 'Post', 'EN', 'review', 'pri', { sentBy: 'kel', sentAt: now - 7 * H })], extras: [],
        log: [{ at: now - 5 * D, by: 'lay', t: 'Sent the draft to Kelvin Inigo' }, { at: now - 7 * H, by: 'kel', t: 'Sent it for copy check to Priya Nair' }] },
      { id: 'weekly', kind: 'ops', name: 'Weekly new listings', by: 'lay', designer: 'ais', due: now + 1 * D, made: now - 4 * D, live: 0,
        thumb: 'organic-weekly', tpl: 'Weekly listings', copy: { EN: { h: 'New this week', s: 'Six homes across Dubai', c: '' } },
        brief: 'Six listings from the sheet.',
        pieces: [pc('p1', 'Post', 'EN', 'ready', 'lay', { sentBy: 'ais' })], extras: [],
        log: [{ at: now - 1 * D, by: 'pri', t: 'Approved the copy' }] },
      { id: 'award', kind: 'ops', name: 'Best Brokerage 2026', by: 'lay', designer: 'kel', due: now - 8 * D, made: now - 12 * D, live: now - 7 * D,
        thumb: 'organic-award', tpl: 'Award', copy: { EN: { h: 'Best Brokerage 2026', s: '', c: '' } }, brief: 'Award announcement.',
        pieces: [pc('p1', 'Post', 'EN', 'ready', 'lay', { dl: true })], extras: [],
        log: [{ at: now - 7 * D, by: 'lay', t: 'Marked it posted' }] }
    ]
  };
};
