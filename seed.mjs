import { closeDatabase, saveEvent } from '../src/db.mjs';

const now = new Date();
const year = now.getFullYear();
const iso = (month, day, hour, minute = 0) => new Date(year, month - 1, day, hour, minute).toISOString();

const events = [
  {
    id: `ERK-${year}-DEMO1`, source: 'manual', municipality: 'Geel', name: 'Zomerfestival Geel',
    startAt: iso(8, 22, 14), endAt: iso(8, 23, 1), address: 'Markt, 2440 Geel', attendance: 3200,
    organizer: { name: 'VZW Geel Bruist', contact: 'Nele Jacobs', email: 'info@example.org' }, status: 'review',
    riskAnswers: { attendance:'2001_5000', audience:'normal', eventType:'music', catering:'own_hot', security:'professional', substances:'abundant', sound:'100db', location:'streets', reputation:'good', accessibility:'normal' },
    factors: { weather:true, specialStructures:true }, notes: 'Tijdelijk podium en afsluiting van omliggende straten.',
    advice: { d1:{ text:'Voorzie vrije aanrijroutes en voldoende blusmiddelen.', status:'approved' } }
  },
  {
    id: `ERK-${year}-DEMO2`, source: 'manual', municipality: 'Westerlo', name: 'Jaarmarkt Westerlo',
    startAt: iso(9, 6, 8), endAt: iso(9, 6, 18), address: 'Centrum Westerlo', attendance: 4800,
    organizer: { name: 'Dienst evenementen' }, status: 'review',
    riskAnswers: { attendance:'2001_5000', audience:'normal', eventType:'fair_market_parade', catering:'external_hot', security:'own', substances:'present_low', sound:'none', location:'streets', reputation:'good', accessibility:'normal' },
    factors: { weather:true }, notes: 'Groot parcours doorheen het centrum.'
  }
];

for (const event of events) await saveEvent(event, { markFeedback: false });
console.log(`${events.length} demodossiers toegevoegd.`);
await closeDatabase();
